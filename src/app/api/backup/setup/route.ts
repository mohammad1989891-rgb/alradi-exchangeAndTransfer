import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MIGRATION_SQL = `
-- Create backups table for the Backup System
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'manual',
  data JSONB NOT NULL,
  record_counts JSONB DEFAULT '{}',
  size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_reason ON backups(reason);

-- Add comment
COMMENT ON TABLE backups IS 'Stores backup snapshots for data protection';
COMMENT ON COLUMN backups.reason IS 'Reason for backup: manual, pre_delete, pre_archive, auto';
COMMENT ON COLUMN backups.data IS 'Full JSON snapshot of all app data';
COMMENT ON COLUMN backups.record_counts IS 'Count of records per table at backup time';
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
      return NextResponse.json({ success: true, message: 'Backups table created successfully' });
    }

    // If RPC doesn't exist, check if table already exists via REST API
    try {
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/backups?select=id&limit=1`, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });

      if (checkResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Backups table already exists ✓',
        });
      }
    } catch {
      // Table doesn't exist
    }

    return NextResponse.json({
      success: false,
      migrationSQL: MIGRATION_SQL.trim(),
      note: 'Run the migrationSQL in Supabase SQL Editor to create the backups table.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      migrationSQL: MIGRATION_SQL.trim(),
      note: 'Run the migrationSQL in Supabase SQL Editor to create the backups table.',
    }, { status: 500 });
  }
}
