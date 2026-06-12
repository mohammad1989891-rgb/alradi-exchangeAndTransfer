-- ============================================
-- Database Indexes for Performance
-- فهرسة قاعدة البيانات لتحسين الأداء
-- ============================================
-- Run this in Supabase SQL Editor

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON transactions(currency_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Debts table indexes
CREATE INDEX IF NOT EXISTS idx_debts_date ON debts(date DESC);
CREATE INDEX IF NOT EXISTS idx_debts_account_id ON debts(account_id);
CREATE INDEX IF NOT EXISTS idx_debts_debt_type ON debts(debt_type);
CREATE INDEX IF NOT EXISTS idx_debts_is_paid ON debts(is_paid);

-- Debt payments table indexes
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(date DESC);

-- Currency exchanges table indexes
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_date ON currency_exchanges(date DESC);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_is_deleted ON currency_exchanges(is_deleted);

-- Vehicle transactions table indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vehicle_id ON vehicle_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_date ON vehicle_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_partner ON vehicle_transactions(partner);

-- Shared transactions table indexes
CREATE INDEX IF NOT EXISTS idx_shared_transactions_date ON shared_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_shared_transactions_partner ON shared_transactions(partner);
