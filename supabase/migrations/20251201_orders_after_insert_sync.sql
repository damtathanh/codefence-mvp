-- ====================================================================
-- SAFE COMBINED MIGRATION: Orders → History + Invoices (INSERT + UPDATE)
--  - Không được phép làm fail import_orders_bulk
-- ====================================================================

-- 0. Đảm bảo mỗi (user_id, order_id) chỉ có 1 invoice
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_id_order_id_key
ON public.invoices (user_id, order_id);

-- ====================================================================
-- 1) FUNCTION: log History khi INSERT (có TRY/CATCH, không bao giờ làm fail)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.orders_after_insert_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Nếu thiếu user_id hoặc status thì bỏ qua, tránh lỗi RLS / NOT NULL / ENUM
  IF NEW.user_id IS NULL OR NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.order_events (user_id, order_id, event_type, payload_json)
    VALUES (
      NEW.user_id,
      NEW.id,
      NEW.status,  -- log đúng status, ví dụ "Customer Paid", "Order Approved"
      jsonb_build_object(
        'source', 'bulk_import',
        'payment_method', COALESCE(NEW.payment_method, 'COD'),
        'risk_level', NEW.risk_level,
        'amount', NEW.amount
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Không raise, chỉ ghi NOTICE cho dev nếu muốn debug
      RAISE NOTICE 'orders_after_insert_sync failed for order %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_after_insert_sync ON public.orders;

CREATE TRIGGER orders_after_insert_sync
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_after_insert_sync();

-- ====================================================================
-- 2) FUNCTION: sync Invoice (INSERT + UPDATE) theo rule (cũng có TRY/CATCH)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.orders_invoice_status_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_cod boolean;
  v_risk text;
BEGIN
  -- Nếu thiếu user_id hoặc status thì bỏ qua, không chặn import
  IF NEW.user_id IS NULL OR NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_cod := (COALESCE(NEW.payment_method, 'COD') = 'COD');
  v_risk := LOWER(COALESCE(NEW.risk_level, ''));

  --------------------------------------------------------------------
  -- ANY → Customer Paid → Invoice = Paid
  -- (Giả định status "đã thanh toán" trong orders = 'Customer Paid')
  -- Có thể thêm alias nếu m từng dùng 'Paid' hay 'Order Paid' cho data cũ
  --------------------------------------------------------------------
  IF NEW.status IN ('Customer Paid', 'Order Paid', 'ORDER_PAID', 'Paid') THEN
    BEGIN
      INSERT INTO public.invoices (
        user_id,
        order_id,
        invoice_code,
        status,
        amount,
        date
      )
      VALUES (
        NEW.user_id,
        NEW.id,
        'INV-' || COALESCE(NEW.order_id, SUBSTR(NEW.id::text, 1, 8)),
        'Paid',
        COALESCE(NEW.amount, 0),
        COALESCE(
          NEW.order_date::date,
          (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        )
      )
      ON CONFLICT (user_id, order_id)
        DO UPDATE SET
          status = 'Paid',
          amount = EXCLUDED.amount,
          date   = EXCLUDED.date;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'orders_invoice_status_sync(PAID) failed for order %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END IF;

  --------------------------------------------------------------------
  -- Từ đây trở xuống: chỉ áp dụng cho COD & CHƯA PAID
  --------------------------------------------------------------------
  IF NOT v_is_cod THEN
    RETURN NEW;
  END IF;

  --------------------------------------------------------------------
  -- COD + LOW RISK → Order Approved → Pending
  -- (status trong orders = 'Order Approved')
  --------------------------------------------------------------------
  IF v_risk = 'low'
     AND NEW.status IN ('Order Approved') THEN

    BEGIN
      INSERT INTO public.invoices (
        user_id,
        order_id,
        invoice_code,
        status,
        amount,
        date
      )
      VALUES (
        NEW.user_id,
        NEW.id,
        'INV-' || COALESCE(NEW.order_id, SUBSTR(NEW.id::text, 1, 8)),
        'Pending',
        COALESCE(NEW.amount, 0),
        COALESCE(
          NEW.order_date::date,
          (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        )
      )
      ON CONFLICT (user_id, order_id)
        DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'orders_invoice_status_sync(LOW/PENDING) failed for order %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END IF;

  --------------------------------------------------------------------
  -- COD + MED/HIGH → Customer Confirmed → Pending
  -- (status trong orders = 'Customer Confirmed')
  --------------------------------------------------------------------
  IF v_risk IN ('medium', 'high')
     AND NEW.status IN ('Customer Confirmed', 'CUSTOMER_CONFIRMED') THEN

    BEGIN
      INSERT INTO public.invoices (
        user_id,
        order_id,
        invoice_code,
        status,
        amount,
        date
      )
      VALUES (
        NEW.user_id,
        NEW.id,
        'INV-' || COALESCE(NEW.order_id, SUBSTR(NEW.id::text, 1, 8)),
        'Pending',
        COALESCE(NEW.amount, 0),
        COALESCE(
          NEW.order_date::date,
          (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        )
      )
      ON CONFLICT (user_id, order_id)
        DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'orders_invoice_status_sync(MED/HIGH/PENDING) failed for order %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_invoice_status_sync ON public.orders;

CREATE TRIGGER orders_invoice_status_sync
AFTER INSERT OR UPDATE OF status, risk_level, payment_method
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_invoice_status_sync();
