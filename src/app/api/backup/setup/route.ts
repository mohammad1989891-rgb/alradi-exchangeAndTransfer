import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Backup Setup API
// 🔸 Checks if backups table exists and creates it if possible
// 🔸 Accepts dbPassword to use pg package for direct SQL execution
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backups' AND policyname = 'Allow all on backups') THEN
    CREATE POLICY "Allow all on backups" ON backups FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE backups IS 'Stores backup snapshots for data protection';
COMMENT ON COLUMN backups.reason IS 'Reason for backup: manual, pre_delete, pre_archive, auto';
COMMENT ON COLUMN backups.data IS 'Full JSON snapshot of all app data';
COMMENT ON COLUMN backups.record_counts IS 'Count of records per table at backup time';
`;

export async function POST(request: NextRequest) {
  try {
    // Parse request body for dbPassword
    let dbPassword = '';
    try {
      const body = await request.json();
      dbPassword = body.dbPassword || '';
    } catch {
      // No body or invalid JSON, continue without password
    }

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
      // If dbPassword is provided, use pg to create the table directly
      if (dbPassword) {
        try {
          const { Client } = await import('pg');
          const projectRef = 'hdlpvtuplwthqcksaynt';
          const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

          const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            query_timeout: 30000,
            statement_timeout: 30000,
          });

          try {
            const connectPromise = client.connect();
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('انتهت مهلة الاتصال — تأكد من أن قاعدة البيانات متاحة وكلمة المرور صحيحة')), 15000);
            });
            await Promise.race([connectPromise, timeoutPromise]);

            // Execute the migration SQL
            await client.query(MIGRATION_SQL);

            // Verify the table was created
            const { rows } = await client.query(`
              SELECT table_name FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'backups'
            `);

            await client.end();

            if (rows.length > 0) {
              return NextResponse.json({
                success: true,
                message: 'تم إنشاء جدول النسخ الاحتياطية بنجاح ✓',
              });
            } else {
              return NextResponse.json({
                success: false,
                migrationSQL: MIGRATION_SQL.trim(),
                note: 'لم يتم التأكد من إنشاء الجدول. قم بتشغيل SQL التالي في Supabase SQL Editor.',
              });
            }
          } catch (dbError) {
            try {
              const endPromise = client.end();
              const cleanupTimeout = new Promise<void>((resolve) => setTimeout(() => resolve(), 3000));
              await Promise.race([endPromise, cleanupTimeout]);
            } catch {}
            throw dbError;
          }
        } catch (pgError) {
          const pgMessage = pgError instanceof Error ? pgError.message : 'Unknown error';
          let friendlyMessage = pgMessage;
          if (pgMessage.includes('password authentication failed')) {
            friendlyMessage = 'كلمة مرور قاعدة البيانات غير صحيحة';
          } else if (pgMessage.includes('ENOTFOUND') || pgMessage.includes('tenant/user')) {
            friendlyMessage = 'فشل الاتصال — تأكد من صحة كلمة مرور قاعدة البيانات';
          } else if (pgMessage.includes('مهلة الاتصال') || pgMessage.includes('timeout')) {
            friendlyMessage = 'انتهت مهلة الاتصال — تأكد من صحة كلمة المرور وأن قاعدة البيانات متاحة';
          }
          return NextResponse.json({
            success: false,
            error: friendlyMessage,
            migrationSQL: MIGRATION_SQL.trim(),
            note: 'فشل الاتصال المباشر بقاعدة البيانات. يمكنك تشغيل SQL التالي يدوياً في Supabase SQL Editor.',
          });
        }
      }

      // No password provided — provide SQL for manual execution
      return NextResponse.json({
        success: false,
        migrationSQL: MIGRATION_SQL.trim(),
        needPassword: true,
        note: 'لا يمكن إنشاء الجدول تلقائياً بدون كلمة مرور قاعدة البيانات. أدخل كلمة مرور قاعدة البيانات أو قم بتشغيل SQL التالي يدوياً في Supabase SQL Editor.',
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
