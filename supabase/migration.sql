-- ============================================
-- Supabase Migration for الراضي للصرافة والحوالات
-- Creates all tables with proper types, constraints, and RLS policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Currencies Table
-- ============================================
CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  exchange_rate DOUBLE PRECISION NOT NULL DEFAULT 1,
  conversion_method TEXT NOT NULL DEFAULT 'MULTIPLY' CHECK (conversion_method IN ('MULTIPLY', 'DIVIDE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Vaults Table
-- ============================================
CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY,
  currency_id TEXT NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  opening_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Accounts Table
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (type IN ('PRIVATE', 'PUBLIC')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Transactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  currency_id TEXT NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  base_currency_id TEXT REFERENCES currencies(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('CASH', 'DEFERRED')),
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  conversion_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
  conversion_method TEXT NOT NULL DEFAULT 'MULTIPLY' CHECK (conversion_method IN ('MULTIPLY', 'DIVIDE')),
  fees_type TEXT NOT NULL DEFAULT 'FIXED' CHECK (fees_type IN ('FIXED', 'PERCENTAGE', 'PER_THOUSAND')),
  fees_direction TEXT NOT NULL DEFAULT 'INCOME' CHECK (fees_direction IN ('INCOME', 'EXPENSE')),
  fees_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  final_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_overflow_transaction BOOLEAN NOT NULL DEFAULT false,
  related_payment_id TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Debts Table
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  currency_id TEXT NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  conversion_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
  conversion_method TEXT NOT NULL DEFAULT 'MULTIPLY' CHECK (conversion_method IN ('MULTIPLY', 'DIVIDE')),
  final_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT,
  debt_type TEXT NOT NULL DEFAULT 'RECEIVABLE' CHECK (debt_type IN ('RECEIVABLE', 'PAYABLE')),
  debt_mode TEXT NOT NULL DEFAULT 'DEFERRED' CHECK (debt_mode IN ('CASH', 'DEFERRED')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Debt Payments Table
-- ============================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency_id TEXT NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  description TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_mode TEXT CHECK (payment_mode IN ('CASH', 'DEFERRED')),
  payment_direction TEXT CHECK (payment_direction IN ('RECEIVABLE', 'PAYABLE')),
  overflow_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Currency Exchanges Table
-- ============================================
CREATE TABLE IF NOT EXISTS currency_exchanges (
  id TEXT PRIMARY KEY,
  outgoing_currency_id TEXT NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  incoming_currency_id TEXT NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  outgoing_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  incoming_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  outgoing_rate_at_time DOUBLE PRECISION NOT NULL DEFAULT 1,
  incoming_rate_at_time DOUBLE PRECISION NOT NULL DEFAULT 1,
  outgoing_conversion_method TEXT NOT NULL DEFAULT 'MULTIPLY' CHECK (outgoing_conversion_method IN ('MULTIPLY', 'DIVIDE')),
  incoming_conversion_method TEXT NOT NULL DEFAULT 'MULTIPLY' CHECK (incoming_conversion_method IN ('MULTIPLY', 'DIVIDE')),
  outgoing_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  incoming_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Vehicles Table
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plate_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Vehicle Transactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_transactions (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  partner TEXT NOT NULL CHECK (partner IN ('first', 'second')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'deferred')),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Shared Transactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS shared_transactions (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  partner TEXT NOT NULL CHECK (partner IN ('first', 'second')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'deferred')),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Vehicles Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles_settings (
  id TEXT PRIMARY KEY,
  first_partner_name TEXT NOT NULL DEFAULT 'الشريك الأول',
  second_partner_name TEXT NOT NULL DEFAULT 'الشريك الثاني',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vaults_currency_id ON vaults(currency_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON transactions(currency_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_is_complete ON transactions(is_complete);
CREATE INDEX IF NOT EXISTS idx_debts_account_id ON debts(account_id);
CREATE INDEX IF NOT EXISTS idx_debts_currency_id ON debts(currency_id);
CREATE INDEX IF NOT EXISTS idx_debts_date ON debts(date DESC);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_date ON currency_exchanges(date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vehicle_id ON vehicle_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- Row Level Security (RLS) Policies
-- Allow full access with anon key (since this is a private app)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_settings ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for authenticated and anon users
-- (using service_role or anon key)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'currencies', 'vaults', 'accounts', 'transactions', 'debts',
    'debt_payments', 'currency_exchanges', 'users', 'vehicles',
    'vehicle_transactions', 'shared_transactions', 'vehicles_settings'
  ]) LOOP
    EXECUTE format('
      CREATE POLICY "Allow all operations on %I" ON %I
      FOR ALL USING (true) WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END $$;

-- ============================================
-- Enable Realtime for all tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE currencies;
ALTER PUBLICATION supabase_realtime ADD TABLE vaults;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE debts;
ALTER PUBLICATION supabase_realtime ADD TABLE debt_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE currency_exchanges;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles_settings;

-- ============================================
-- Insert default admin user
-- ============================================
INSERT INTO users (id, username, password, name)
VALUES ('user_admin', 'admin', 'admin123', 'المدير')
ON CONFLICT (id) DO NOTHING;
