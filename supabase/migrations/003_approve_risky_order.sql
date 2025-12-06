-- 003_approve_risky_order.sql

CREATE OR REPLACE FUNCTION public.approve_risky_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.order_events (order_id, event_type, payload_json)
  VALUES (
    p_order_id,
    'ORDER_APPROVED',
    jsonb_build_object(
      'message', 'Shop Owner approved the order',
      'source',  'manual_rpc'
    )
  );

  UPDATE public.orders
  SET status     = 'Order Approved',
      updated_at = NOW()
  WHERE id = p_order_id;
END;
$$;
