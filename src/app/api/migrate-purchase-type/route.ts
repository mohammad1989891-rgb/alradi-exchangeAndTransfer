import { NextResponse } from 'next/server';

const MIGRATION_SQL = `
-- Add purchase_type column to purchases table (for opening-inventory feature)
-- 'purchase' (default) = real purchase invoice (deducts from USD vault)
-- 'opening_inventory'  = opening inventory balance (inventory-only, no vault effect)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_type TEXT NOT NULL DEFAULT 'purchase';
`;

export async function POST() {
  try {
    // Build the connection string from env (Supabase pooler)
    const projectRef = 'hdlpvtuplwthqcksaynt';
    const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
    if (!dbPassword) {
      return NextResponse.json(
        { error: 'SUPABASE_DB_PASSWORD env var not set on the server' },
        { status: 500 }
      );
    }
    const encodedPassword = encodeURIComponent(dbPassword);
    const connectionString = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

    const { Client } = await import('pg');
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      query_timeout: 30000,
      statement_timeout: 30000,
    });

    try {
      await client.connect();
      await client.query(MIGRATION_SQL);

      // Verify the column was added
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'purchase_type'`
      );
      await client.end();

      return NextResponse.json({
        success: true,
        message: 'purchase_type column added to purchases table',
        columnExists: rows.length > 0,
      });
    } catch (dbError) {
      try { await client.end(); } catch {}
      throw dbError;
    }
  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Check if purchase_type column exists (via Supabase REST API — no DB password needed)
export async function GET() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdlpvtuplwthqcksaynt.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';

    try {
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/purchases?select=purchase_type&limit=1`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (checkResponse.ok) {
        return NextResponse.json({ columnExists: true });
      } else {
        const err = await checkResponse.json().catch(() => ({}));
        if (err.message?.includes('does not exist') || err.message?.includes('Could not find')) {
          return NextResponse.json({ columnExists: false });
        }
        return NextResponse.json({ columnExists: false, error: err.message || 'unknown error' });
      }
    } catch {
      return NextResponse.json({ columnExists: false, error: 'check failed' });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
