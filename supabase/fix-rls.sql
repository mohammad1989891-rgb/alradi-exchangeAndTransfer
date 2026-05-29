-- ============================================
-- Fix RLS Policies for الراضي للصرافة والحوالات
-- This script fixes Row Level Security policies to allow
-- full access with the anon key (for private app use)
-- 
-- RUN THIS IN: Supabase SQL Editor
-- https://supabase.com/dashboard/project/hdlpvtuplwthqcksaynt/sql
-- ============================================

-- ============================================
-- Step 1: Disable RLS temporarily (safest approach for private app)
-- ============================================
-- This is the simplest and most reliable fix.
-- Since this is a private app (no public user authentication),
-- disabling RLS allows the anon key to access all data.

ALTER TABLE currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE vaults DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchanges DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 2: Drop existing policies (cleanup)
-- ============================================
-- Remove any existing policies that might conflict

DROP POLICY IF EXISTS "Allow all operations on currencies" ON currencies;
DROP POLICY IF EXISTS "Allow all operations on vaults" ON vaults;
DROP POLICY IF EXISTS "Allow all operations on accounts" ON accounts;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on debts" ON debts;
DROP POLICY IF EXISTS "Allow all operations on debt_payments" ON debt_payments;
DROP POLICY IF EXISTS "Allow all operations on currency_exchanges" ON currency_exchanges;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations on vehicle_transactions" ON vehicle_transactions;
DROP POLICY IF EXISTS "Allow all operations on shared_transactions" ON shared_transactions;
DROP POLICY IF EXISTS "Allow all operations on vehicles_settings" ON vehicles_settings;

-- ============================================
-- Step 3: Re-enable RLS with permissive policies
-- ============================================
-- If you prefer to keep RLS enabled (recommended for production),
-- uncomment the following lines:

-- ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE currency_exchanges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehicle_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehicles_settings ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all on currencies" ON currencies FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on vaults" ON vaults FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on debts" ON debts FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on debt_payments" ON debt_payments FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on currency_exchanges" ON currency_exchanges FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on vehicle_transactions" ON vehicle_transactions FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on shared_transactions" ON shared_transactions FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all on vehicles_settings" ON vehicles_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Step 4: Enable Realtime for all tables
-- ============================================
-- Make sure Realtime is enabled for live updates

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
-- Done! Verify by running:
-- SELECT * FROM currencies LIMIT 5;
-- ============================================
