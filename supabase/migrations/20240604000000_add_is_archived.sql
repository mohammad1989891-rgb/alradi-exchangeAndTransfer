-- Add is_archived column to transaction tables
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE currency_exchanges ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_is_archived ON transactions(is_archived);
CREATE INDEX IF NOT EXISTS idx_debts_is_archived ON debts(is_archived);
CREATE INDEX IF NOT EXISTS idx_debt_payments_is_archived ON debt_payments(is_archived);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_is_archived ON currency_exchanges(is_archived);
