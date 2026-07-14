-- ============================================
-- Migration: المشتريات والمبيعات (Purchases & Sales)
-- Adds: units, materials, material_units, purchases, sales
-- Safe to re-run (uses IF NOT EXISTS)
-- ============================================

-- ============================================
-- Units Table (وحدات القياس — قائمة رئيسية)
-- ============================================
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Materials Table (المواد)
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Material Units Table (ربط المواد بالوحدات + معامل التحويل)
-- base_factor: معامل التحويل الداخلي للوحدة الأساسية
-- ============================================
CREATE TABLE IF NOT EXISTS material_units (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  base_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(material_id, unit_id)
);

-- ============================================
-- Purchases Table (المشتريات)
-- totalPriceUsd يُخصم من صندوق الدولار
-- purchase_type: 'purchase' (default) → فاتورة شراء فعلية، تخصم الصندوق
--                'opening_inventory' → رصيد افتتاحي للمخزون، يضيف كمية فقط بدون خصم
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  material_name TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_name TEXT NOT NULL,
  base_factor_snapshot DOUBLE PRECISION NOT NULL DEFAULT 1,
  quantity_in_base DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit_price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  purchase_type TEXT NOT NULL DEFAULT 'purchase',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Sales Table (المبيعات — بالدولار، مرتبطة بحساب)
-- payment_method: 'cash' (default) → adds totalPrice to USD vault
--                 'credit'          → deferred; no vault change (unpaid invoice)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  account_name TEXT NOT NULL,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  material_name TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_name TEXT NOT NULL,
  base_factor_snapshot DOUBLE PRECISION NOT NULL DEFAULT 1,
  quantity_in_base DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_default_unit ON materials(default_unit_id);
CREATE INDEX IF NOT EXISTS idx_material_units_material_id ON material_units(material_id);
CREATE INDEX IF NOT EXISTS idx_material_units_unit_id ON material_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_purchases_material_id ON purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_unit_id ON purchases(unit_id);
CREATE INDEX IF NOT EXISTS idx_sales_account_id ON sales(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_material_id ON sales(material_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_unit_id ON sales(unit_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "Allow all on units" ON units;
DROP POLICY IF EXISTS "Allow all on materials" ON materials;
DROP POLICY IF EXISTS "Allow all on material_units" ON material_units;
DROP POLICY IF EXISTS "Allow all on purchases" ON purchases;
DROP POLICY IF EXISTS "Allow all on sales" ON sales;

-- Allow all operations (private app with anon key)
CREATE POLICY "Allow all on units" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on material_units" ON material_units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sales" ON sales FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE units;
ALTER PUBLICATION supabase_realtime ADD TABLE materials;
ALTER PUBLICATION supabase_realtime ADD TABLE material_units;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;

-- ============================================
-- Seed default units (if not exists)
-- ============================================
INSERT INTO units (id, name) VALUES
  ('unit_piece', 'قطعة'),
  ('unit_kg', 'كيلو'),
  ('unit_gram', 'غرام'),
  ('unit_bag', 'كيس'),
  ('unit_carton', 'كرتون'),
  ('unit_ton', 'طن'),
  ('unit_liter', 'لتر'),
  ('unit_box', 'صندوق')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Add payment_method column for existing installations
-- (Safe to re-run: IF NOT EXISTS won't error if the column already exists)
-- ============================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

-- ============================================
-- Add purchase_type column for existing installations
-- 'purchase' (default) = فاتورة شراء فعلية (deducts from USD vault)
-- 'opening_inventory'  = رصيد افتتاحي للمخزون (no vault effect, inventory-only)
-- (Safe to re-run: IF NOT EXISTS won't error if the column already exists)
-- ============================================
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_type TEXT NOT NULL DEFAULT 'purchase';
