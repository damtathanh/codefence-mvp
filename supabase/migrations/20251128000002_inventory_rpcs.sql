-- Create increment_stock function
CREATE OR REPLACE FUNCTION increment_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock = COALESCE(stock, 0) + p_quantity
  WHERE id = p_product_id;
END;
$$;

-- Create decrement_stock function
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(COALESCE(stock, 0) - p_quantity, 0)
  WHERE id = p_product_id;
END;
$$;
