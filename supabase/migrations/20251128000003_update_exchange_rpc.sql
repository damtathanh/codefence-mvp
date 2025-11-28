-- Drop the old function signature to avoid ambiguity or conflicts
DROP FUNCTION IF EXISTS public.process_exchange(uuid, uuid, boolean, numeric, numeric, text);

-- Create the updated function with new_product_id and inventory logic
CREATE OR REPLACE FUNCTION public.process_exchange(
  p_user_id uuid,
  p_order_id uuid,
  p_customer_pays boolean,
  p_customer_amount numeric,
  p_shop_amount numeric,
  p_note text,
  p_new_product_id uuid DEFAULT NULL
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
  v_final_new_product_id uuid;
  v_quantity int := 1; -- Default quantity
BEGIN
  -- 1. Fetch the current order
  SELECT * INTO v_current_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Determine new product ID
  v_final_new_product_id := COALESCE(p_new_product_id, v_current_order.product_id);

  -- 2. Log EXCHANGE event
  INSERT INTO public.order_events (order_id, event_type, payload_json)
  VALUES (
    p_order_id,
    'EXCHANGE',
    jsonb_build_object(
      'customer_paid', p_customer_amount,
      'seller_paid', p_shop_amount,
      'carrier_cost', 40000, -- 20k return + 20k outbound
      'note', p_note,
      'new_product_id', v_final_new_product_id
    )
  );

  -- 3. Insert shipping costs (return + exchange outbound)
  INSERT INTO public.shipping_costs (order_id, type, amount)
  VALUES
    (p_order_id, 'return', 20000),
    (p_order_id, 'exchange', 20000);

  -- 4. Update original order shipping amounts AND status
  v_new_customer_paid := COALESCE(v_current_order.customer_shipping_paid, 0) + p_customer_amount;
  v_new_seller_paid := COALESCE(v_current_order.seller_shipping_paid, 0) + p_shop_amount;

  UPDATE public.orders
  SET
    customer_shipping_paid = v_new_customer_paid,
    seller_shipping_paid = v_new_seller_paid,
    status = 'Exchanged', -- Update status to Exchanged
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 5. Inventory Adjustment
  -- Increment stock for returned item (original product)
  IF v_current_order.product_id IS NOT NULL THEN
    PERFORM increment_stock(v_current_order.product_id, v_quantity);
  END IF;

  -- Decrement stock for new item
  IF v_final_new_product_id IS NOT NULL THEN
    PERFORM decrement_stock(v_final_new_product_id, v_quantity);
  END IF;

  -- 6. Create new exchange order
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
    product, -- Note: We are keeping the old product name string if we don't fetch the new one.
             -- Ideally we should fetch the new product name, but for MVP we rely on product_id join.
             -- If product_id is updated, the UI should show the new product via join.
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
    v_final_new_product_id, -- Use new product ID
    v_current_order.product, -- Legacy field, might be stale
    v_current_order.amount,
    'Pending Review',
    v_current_order.payment_method,
    'Exchange',
    v_current_order.channel
  )
  RETURNING * INTO v_new_order;

  -- 7. Return both original and new order data
  RETURN jsonb_build_object(
    'original_order', jsonb_build_object(
      'id', v_current_order.id,
      'customer_shipping_paid', v_new_customer_paid,
      'seller_shipping_paid', v_new_seller_paid,
      'status', 'Exchanged'
    ),
    'new_order', row_to_json(v_new_order)::jsonb
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_exchange(uuid, uuid, boolean, numeric, numeric, text, uuid) TO authenticated;
