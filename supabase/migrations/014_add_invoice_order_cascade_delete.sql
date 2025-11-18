-- Add foreign key constraint with ON DELETE CASCADE for invoices.order_id
-- This ensures that when an order is deleted, all related invoices are automatically deleted

-- Drop existing FK if it exists (in case it was created without CASCADE)
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;

-- Recreate FK with ON DELETE CASCADE
ALTER TABLE invoices
ADD CONSTRAINT invoices_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES orders (id)
ON DELETE CASCADE;

