-- Ensure invoices.order_id has a foreign key to orders.id with ON DELETE CASCADE
-- This ensures that when an order is deleted, all related invoices are automatically deleted

-- Drop existing FK if it exists (in case it was created without CASCADE)
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;

-- Recreate FK with ON DELETE CASCADE
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES public.orders (id)
ON DELETE CASCADE;

-- Enable Row Level Security on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow clean re-creation)
DROP POLICY IF EXISTS "Invoices select own rows" ON public.invoices;
DROP POLICY IF EXISTS "Invoices insert own rows" ON public.invoices;
DROP POLICY IF EXISTS "Invoices update own rows" ON public.invoices;
DROP POLICY IF EXISTS "Invoices delete own rows" ON public.invoices;

-- Policy: Users can SELECT their own invoices
CREATE POLICY "Invoices select own rows"
ON public.invoices
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can INSERT invoices for their own orders
CREATE POLICY "Invoices insert own rows"
ON public.invoices
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can UPDATE their own invoices
CREATE POLICY "Invoices update own rows"
ON public.invoices
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can DELETE their own invoices
CREATE POLICY "Invoices delete own rows"
ON public.invoices
FOR DELETE
USING (user_id = auth.uid());

