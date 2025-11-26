-- Create a Postgres function to handle order exchange transactionally
-- This replaces the multi-step client-side logic with a single atomic operation

CREATE OR REPLACE FUNCTION public.process_exchange(
  p_user_id uuid,
  p_order_id uuid,
  p_customer_pays boolean,
  p_customer_amount numeric,
  p_shop_amount numeric,
  p_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_order record;
  v_new_order record;
  v_new_order_id text;
  v_new_customer_paid numeric;
  v_new_seller_paid numeric;
BEGIN
  -- 1. Fetch the current order
  SELECT * INTO v_current_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Log EXCHANGE event
  INSERT INTO public.order_events (order_id, event_type, payload_json)
  VALUES (
    p_order_id,
    'EXCHANGE',
    jsonb_build_object(
      'customer_paid', p_customer_amount,
      'seller_paid', p_shop_amount,
      'carrier_cost', 40000, -- 20k return + 20k outbound
      'note', p_note
    )
  );

  -- 3. Insert shipping costs (return + exchange outbound)
  INSERT INTO public.shipping_costs (order_id, type, amount)
  VALUES
    (p_order_id, 'return', 20000),
    (p_order_id, 'exchange', 20000);

  -- 4. Update original order shipping amounts
  v_new_customer_paid := COALESCE(v_current_order.customer_shipping_paid, 0) + p_customer_amount;
  v_new_seller_paid := COALESCE(v_current_order.seller_shipping_paid, 0) + p_shop_amount;

  UPDATE public.orders
  SET
    customer_shipping_paid = v_new_customer_paid,
    seller_shipping_paid = v_new_seller_paid
  WHERE id = p_order_id;

  -- 5. Create new exchange order
  v_new_order_id := v_current_order.order_id || '-EX-' || LPAD((EXTRACT(EPOCH FROM NOW())::bigint % 10000)::text, 4, '0');

  INSERT INTO public.orders (
    user_id,
    order_id,
    customer_name,
    phone,
    address,
    address_detail,
    ward,
    district,
    province,
    product_id,
    product,
    amount,
    status,
    payment_method,
    source,
    channel
  )
  VALUES (
    v_current_order.user_id,
    v_new_order_id,
    v_current_order.customer_name,
    v_current_order.phone,
    v_current_order.address,
    v_current_order.address_detail,
    v_current_order.ward,
    v_current_order.district,
    v_current_order.province,
    v_current_order.product_id,
    v_current_order.product,
    v_current_order.amount,
    'Pending Review',
    v_current_order.payment_method,
    'Exchange',
    v_current_order.channel
  )
  RETURNING * INTO v_new_order;

  -- 6. Return both original and new order data
  RETURN jsonb_build_object(
    'original_order', jsonb_build_object(
      'id', v_current_order.id,
      'customer_shipping_paid', v_new_customer_paid,
      'seller_shipping_paid', v_new_seller_paid
    ),
    'new_order', row_to_json(v_new_order)::jsonb
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_exchange(uuid, uuid, boolean, numeric, numeric, text) TO authenticated;
