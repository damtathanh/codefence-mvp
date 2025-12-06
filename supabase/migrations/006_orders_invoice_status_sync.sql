-- 006_orders_invoice_status_sync.sql

CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_id_order_id_key
ON public.invoices (user_id, order_id);

CREATE OR REPLACE FUNCTION public.orders_invoice_status_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_cod boolean;
  v_risk   text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_cod := (COALESCE(NEW.payment_method, 'COD') = 'COD');
  v_risk   := LOWER(COALESCE(NEW.risk_level, ''));

  -- 1) paid_at -> Invoice Paid
  IF NEW.paid_at IS NOT NULL THEN
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
        (NEW.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      )
      ON CONFLICT (user_id, order_id)
      DO UPDATE SET
        status = 'Paid',
        amount = EXCLUDED.amount,
        date   = EXCLUDED.date;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'orders_invoice_status_sync(Paid) failed for order %: %',
          NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END IF;

  -- 2) Chưa paid, chỉ xử lý COD
  IF NOT v_is_cod THEN
    RETURN NEW;
  END IF;

  -- 2a) COD + LOW + Order Approved -> Pending
  IF v_risk = 'low'
     AND NEW.status = 'Order Approved' THEN
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
        RAISE NOTICE 'orders_invoice_status_sync(LOW/Pending) failed for order %: %',
          NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END IF;

  -- 2b) COD + MED/HIGH + Customer Confirmed -> Pending
  IF v_risk IN ('medium', 'high')
     AND NEW.status = 'Customer Confirmed' THEN
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
        RAISE NOTICE 'orders_invoice_status_sync(MED/HIGH/Pending) failed for order %: %',
          NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_invoice_status_sync ON public.orders;
DROP TRIGGER IF EXISTS sync_invoice_on_paid ON public.orders;

CREATE TRIGGER orders_invoice_status_sync
AFTER INSERT OR UPDATE OF status, payment_method, risk_level, amount, order_date, paid_at
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_invoice_status_sync();
