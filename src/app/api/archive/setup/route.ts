import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MIGRATION_SQL = `
-- Add is_archived column to transaction tables
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE currency_exchanges ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_is_archived ON transactions(is_archived);

CREATE INDEX IF NOT EXISTS idx_debts_date ON debts(date);
CREATE INDEX IF NOT EXISTS idx_debts_account_id ON debts(account_id);
CREATE INDEX IF NOT EXISTS idx_debts_is_archived ON debts(is_archived);

CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(date);
CREATE INDEX IF NOT EXISTS idx_debt_payments_is_archived ON debt_payments(is_archived);

CREATE INDEX IF NOT EXISTS idx_currency_exchanges_date ON currency_exchanges(date);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_is_archived ON currency_exchanges(is_archived);
`;

export async function POST() {
  try {
    // Try to execute the migration SQL via Supabase RPC
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'Migration executed successfully' });
    }

    // If RPC doesn't exist, check if columns already exist via REST API
    const tables = ['transactions', 'debts', 'debt_payments', 'currency_exchanges'];
    const results: Record<string, string> = {};
    let allExist = true;

    for (const table of tables) {
      try {
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=is_archived&limit=1`, {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        });

        if (checkResponse.ok) {
          results[table] = 'is_archived column exists ✓';
        } else {
          results[table] = 'is_archived column MISSING - needs manual migration';
          allExist = false;
        }
      } catch {
        results[table] = 'error checking table';
        allExist = false;
      }
    }

    return NextResponse.json({
      success: allExist,
      results,
      migrationSQL: MIGRATION_SQL.trim(),
      note: allExist
        ? 'All columns exist. No migration needed.'
        : 'Run the migrationSQL in Supabase SQL Editor to add missing columns and indexes.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      migrationSQL: MIGRATION_SQL.trim(),
      note: 'Run the migrationSQL in Supabase SQL Editor to add the is_archived column and indexes.',
    }, { status: 500 });
  }
}
