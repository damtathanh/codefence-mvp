-- 001_set_updated_at.sql

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- orders
DROP TRIGGER IF EXISTS set_updated_at ON public.orders;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- products
DROP TRIGGER IF EXISTS set_updated_at ON public.products;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
