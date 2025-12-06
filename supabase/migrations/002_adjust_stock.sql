-- 002_adjust_stock.sql

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id uuid,
  p_delta      integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(COALESCE(stock, 0) + p_delta, 0)
  WHERE id = p_product_id;
END;
$$;
