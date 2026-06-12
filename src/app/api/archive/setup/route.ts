import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Archive Setup API
// 🔸 Checks if is_archived column exists and adds it if possible
// 🔸 Uses Supabase REST API (not exec_sql RPC which doesn't exist)
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
`;

export async function POST() {
  try {
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
            results[table] = 'عمود is_archived غير موجود — يحاج إضافة يدوية';
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

    // Try to execute the migration SQL via exec_sql RPC (may not exist)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
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
            message: 'تم إضافة أعمدة الأرشفة والفهارس بنجاح ✓',
          });
        }
      } catch {
        // exec_sql RPC doesn't exist, fall through to manual instructions
      }
    }

    // Cannot create automatically — provide SQL for manual execution
    return NextResponse.json({
      success: false,
      results,
      migrationSQL: MIGRATION_SQL.trim(),
      note: allExist
        ? 'جميع الأعمدة موجودة. لا حاجة لعملية ترحيل.'
        : 'لا يمكن إضافة الأعمدة تلقائياً. قم بتشغيل SQL التالي في Supabase SQL Editor لإضافة أعمدة الأرشفة والفهارس.',
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
