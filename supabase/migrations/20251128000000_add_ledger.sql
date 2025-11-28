-- Create order_financial_transactions table
CREATE TABLE IF NOT EXISTS order_financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id), -- Owner of the transaction (Shop)
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'payment', 'refund', 'return_fee', 'exchange_adjustment', etc.
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  direction TEXT NOT NULL, -- 'inflow', 'outflow'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) -- Actor who performed the action
);

-- Indexes for performance
CREATE INDEX idx_ledger_order_id ON order_financial_transactions(order_id);
CREATE INDEX idx_ledger_user_id ON order_financial_transactions(user_id);
CREATE INDEX idx_ledger_type ON order_financial_transactions(type);
CREATE INDEX idx_ledger_created_at ON order_financial_transactions(created_at);

-- Enable RLS
ALTER TABLE order_financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own financial transactions"
  ON order_financial_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial transactions"
  ON order_financial_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No update/delete policy for now to ensure immutable ledger (mostly)
-- Or allow if strictly needed, but ledger should be append-only ideally.
-- For MVP, we might need to correct mistakes, but let's stick to append-only for now unless requested.
