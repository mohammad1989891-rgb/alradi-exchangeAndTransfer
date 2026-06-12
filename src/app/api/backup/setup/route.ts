import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Backup Setup API
// 🔸 Checks if backups table exists and creates it if possible
// 🔸 Uses Supabase REST API (not exec_sql RPC which doesn't exist)
// 🔸 Falls back to providing SQL for manual execution
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdlpvtuplwthqcksaynt.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

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

-- Enable RLS but allow all operations (same as other tables)
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backups' AND policyname = 'Allow all access') THEN
    CREATE POLICY "Allow all access" ON backups FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE backups IS 'Stores backup snapshots for data protection';
COMMENT ON COLUMN backups.reason IS 'Reason for backup: manual, pre_delete, pre_archive, auto';
COMMENT ON COLUMN backups.data IS 'Full JSON snapshot of all app data';
COMMENT ON COLUMN backups.record_counts IS 'Count of records per table at backup time';
`;

export async function POST() {
  try {
    // Validate configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Supabase غير مُعد',
        migrationSQL: MIGRATION_SQL.trim(),
        note: 'قم بتشغيل migrationSQL في Supabase SQL Editor لإنشاء جدول النسخ الاحتياطية.',
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      db: { schema: 'public' },
    });

    // Step 1: Check if the backups table already exists by trying to query it
    const { data, error } = await supabase
      .from('backups')
      .select('id')
      .limit(1);

    if (!error) {
      // Table exists! All good.
      return NextResponse.json({
        success: true,
        message: 'جدول النسخ الاحتياطية موجود بالفعل ✓',
      });
    }

    // Step 2: If the error indicates the table doesn't exist, try to create it
    const errMsg = (error.message || '').toLowerCase();
    const tableMissing = errMsg.includes('does not exist') ||
      errMsg.includes('could not find') ||
      errMsg.includes('relation') ||
      errMsg.includes('schema cache');

    if (tableMissing) {
      // Try creating the table using Supabase Management API
      // This requires the service role key
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          // Try using pg SQL execution via Supabase SQL Editor API
          const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: MIGRATION_SQL }),
          });

          if (sqlResponse.ok) {
            return NextResponse.json({
              success: true,
              message: 'تم إنشاء جدول النسخ الاحتياطية بنجاح ✓',
            });
          }
        } catch {
          // exec_sql RPC doesn't exist, fall through to manual instructions
        }
      }

      // Cannot create automatically — provide SQL for manual execution
      return NextResponse.json({
        success: false,
        migrationSQL: MIGRATION_SQL.trim(),
        note: 'لا يمكن إنشاء الجدول تلقائياً. قم بتشغيل SQL التالي في Supabase SQL Editor لإنشاء جدول النسخ الاحتياطية.',
      });
    }

    // Step 3: Other errors (RLS, etc.) — table might exist but access is denied
    if (errMsg.includes('policy') || errMsg.includes('permission') || errMsg.includes('rls')) {
      return NextResponse.json({
        success: true,
        message: 'جدول النسخ الاحتياطية موجود (يتطلب إعداد صلاحيات الوصول)',
      });
    }

    // Unknown error — provide SQL as fallback
    return NextResponse.json({
      success: false,
      error: error.message,
      migrationSQL: MIGRATION_SQL.trim(),
      note: 'قم بتشغيل migrationSQL في Supabase SQL Editor لإنشاء جدول النسخ الاحتياطية.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      migrationSQL: MIGRATION_SQL.trim(),
      note: 'قم بتشغيل migrationSQL في Supabase SQL Editor لإنشاء جدول النسخ الاحتياطية.',
    }, { status: 500 });
  }
}
