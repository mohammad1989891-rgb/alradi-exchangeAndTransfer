import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Archive Setup API
// 🔸 Checks if is_archived column exists and adds it if possible
// 🔸 Accepts dbPassword to use pg package for direct SQL execution
// 🔸 Falls back to providing SQL for manual execution
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdlpvtuplwthqcksaynt.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

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

-- Add opening_balance_date to vaults if missing
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS opening_balance_date TIMESTAMPTZ;
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
        note: 'قم بتشغيل migrationSQL في Supabase SQL Editor لإضافة عمود الأرشفة والفهارس.',
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      db: { schema: 'public' },
    });

    // Check if is_archived column exists by querying each table
    const tables = ['transactions', 'debts', 'debt_payments', 'currency_exchanges'];
    const results: Record<string, string> = {};
    let allExist = true;

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('is_archived')
          .limit(1);

        if (!error) {
          results[table] = 'is_archived column exists ✓';
        } else {
          const errMsg = (error.message || '').toLowerCase();
          if (errMsg.includes('does not exist') || errMsg.includes('could not find') || errMsg.includes('relation')) {
            results[table] = 'الجدول غير موجود — يجب إعداد قاعدة البيانات أولاً';
            allExist = false;
          } else if (errMsg.includes('column') || errMsg.includes('is_archived')) {
            results[table] = 'عمود is_archived غير موجود — يحتاج إضافة';
            allExist = false;
          } else {
            // Might be RLS or other error — assume column might exist
            results[table] = 'لا يمكن التحقق (خطأ في الصلاحيات)';
          }
        }
      } catch {
        results[table] = 'خطأ في التحقق';
        allExist = false;
      }
    }

    // If all columns exist, return success
    if (allExist) {
      return NextResponse.json({
        success: true,
        results,
        message: 'جميع أعمدة الأرشفة والفهارس موجودة ✓',
      });
    }

    // If dbPassword is provided, use pg to add columns directly
    if (dbPassword) {
      try {
        const { Client } = await import('pg');
        const projectRef = 'hdlpvtuplwthqcksaynt';
        const encodedPassword = encodeURIComponent(dbPassword);
        const connectionString = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

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

          await client.end();

          return NextResponse.json({
            success: true,
            message: 'تم إضافة أعمدة الأرشفة والفهارس بنجاح ✓',
          });
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
        } else if (pgMessage.includes('3D000') || pgMessage.includes('database')) {
          friendlyMessage = 'قاعدة البيانات غير موجودة — تأكد من أن الجداول الأساسية موجودة أولاً';
        }
        return NextResponse.json({
          success: false,
          error: friendlyMessage,
          results,
          migrationSQL: MIGRATION_SQL.trim(),
          note: 'فشل الاتصال المباشر بقاعدة البيانات. يمكنك تشغيل SQL التالي يدوياً في Supabase SQL Editor.',
        });
      }
    }

    // No password provided — provide SQL for manual execution
    return NextResponse.json({
      success: false,
      results,
      migrationSQL: MIGRATION_SQL.trim(),
      needPassword: true,
      note: allExist
        ? 'جميع الأعمدة موجودة. لا حاجة لعملية ترحيل.'
        : 'لا يمكن إضافة الأعمدة تلقائياً بدون كلمة مرور قاعدة البيانات. أدخل كلمة مرور قاعدة البيانات أو قم بتشغيل SQL التالي يدوياً في Supabase SQL Editor.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      migrationSQL: MIGRATION_SQL.trim(),
      note: 'قم بتشغيل migrationSQL في Supabase SQL Editor لإضافة عمود الأرشفة والفهارس.',
    }, { status: 500 });
  }
}
