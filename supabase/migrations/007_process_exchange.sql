-- 007_process_exchange.sql

CREATE OR REPLACE FUNCTION public.process_exchange(
  p_order_id       uuid,
  p_new_product_id uuid,
  p_quantity       integer
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_order    public.orders%ROWTYPE;
  v_new_order_id uuid;
BEGIN
  SELECT * INTO v_old_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  INSERT INTO public.orders (
    user_id,
    customer_name,
    phone,
    product_id,
    quantity,
    amount,
    address_detail,
    ward,
    district,
    province,
    channel,
    source,
    status,
    original_order_id
  )
  VALUES (
    v_old_order.user_id,
    v_old_order.customer_name,
    v_old_order.phone,
    p_new_product_id,
    p_quantity,
    v_old_order.amount,
    v_old_order.address_detail,
    v_old_order.ward,
    v_old_order.district,
    v_old_order.province,
    v_old_order.channel,
    v_old_order.source,
    'Exchanged',
    v_old_order.id
  )
  RETURNING id INTO v_new_order_id;

  IF v_old_order.product_id IS NOT NULL THEN
    PERFORM public.adjust_stock(v_old_order.product_id, p_quantity);
  END IF;

  IF p_new_product_id IS NOT NULL THEN
    PERFORM public.adjust_stock(p_new_product_id, -p_quantity);
  END IF;

  UPDATE public.orders
  SET status = 'Exchanged'
  WHERE id = p_order_id;

  RETURN v_new_order_id;
END;
$$;
