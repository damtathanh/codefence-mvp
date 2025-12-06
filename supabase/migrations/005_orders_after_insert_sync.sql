-- 005_orders_after_insert_sync.sql

CREATE OR REPLACE FUNCTION public.orders_after_insert_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.order_events (user_id, order_id, event_type, payload_json)
    VALUES (
      NEW.user_id,
      NEW.id,
      NEW.status,
      jsonb_build_object(
        'source', 'bulk_import',
        'payment_method', COALESCE(NEW.payment_method, 'COD'),
        'risk_level', NEW.risk_level,
        'amount', NEW.amount
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
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
