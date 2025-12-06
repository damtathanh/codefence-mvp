-- 009_update_merchant_summary.sql

CREATE OR REPLACE FUNCTION public.update_merchant_summary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.merchants_summary
  SET
    total_orders    = total_orders + 1,
    total_revenue   = total_revenue + COALESCE(NEW.amount, 0),
    avg_order_value = (total_revenue + COALESCE(NEW.amount, 0))::numeric / (total_orders + 1),
    last_order_date = NOW(),
    updated_at      = NOW()
  WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.merchants_summary (
      user_id,
      total_orders,
      total_revenue,
      avg_order_value,
      last_order_date,
      updated_at
    )
    VALUES (
      NEW.user_id,
      1,
      COALESCE(NEW.amount, 0),
      COALESCE(NEW.amount, 0),
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_merchant_summary ON public.orders;

CREATE TRIGGER update_merchant_summary
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_merchant_summary();
