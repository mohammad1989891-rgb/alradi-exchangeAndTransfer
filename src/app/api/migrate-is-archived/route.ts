import { NextRequest, NextResponse } from 'next/server';

const MIGRATION_SQL = `
-- Add is_archived column to transaction tables
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE currency_exchanges ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_is_archived ON transactions(is_archived);
CREATE INDEX IF NOT EXISTS idx_debts_is_archived ON debts(is_archived);
CREATE INDEX IF NOT EXISTS idx_debt_payments_is_archived ON debt_payments(is_archived);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_is_archived ON currency_exchanges(is_archived);
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseUrl, dbPassword } = body;

    // Build the connection string
    let connectionString = databaseUrl;

    // If only password is provided, construct the Supabase pooler URL
    if (!connectionString && dbPassword) {
      const projectRef = 'hdlpvtuplwthqcksaynt';
      // URL-encode the password to handle special characters (# @ etc.)
      const encodedPassword = encodeURIComponent(dbPassword);
      connectionString = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
    }

    if (!connectionString) {
      return NextResponse.json(
        { error: 'يجب تقديم كلمة مرور قاعدة البيانات أو سلسلة الاتصال' },
        { status: 400 }
      );
    }

    // Use pg to execute the migration
    const { Client } = await import('pg');

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      query_timeout: 30000,
      statement_timeout: 30000,
    });

    try {
      const connectPromise = client.connect();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال — تأكد من أن كلمة المرور صحيحة')), 20000);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Execute the migration
      await client.query(MIGRATION_SQL);

      // Verify columns were added
      const tables = ['transactions', 'debts', 'debt_payments', 'currency_exchanges'];
      const results: Record<string, boolean> = {};

      for (const table of tables) {
        const { rows } = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'is_archived'`,
          [table]
        );
        results[table] = rows.length > 0;
      }

      await client.end();

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully - is_archived columns and indexes added',
        results,
      });
    } catch (dbError) {
      try {
        await client.end();
      } catch {}
      throw dbError;
    }
  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';

    let friendlyMessage = message;
    if (message.includes('ENOTFOUND') || message.includes('tenant/user')) {
      friendlyMessage = 'فشل الاتصال — تأكد من صحة كلمة مرور قاعدة البيانات';
    } else if (message.includes('password authentication failed')) {
      friendlyMessage = 'كلمة المرور غير صحيحة — تحقق من كلمة مرور قاعدة البيانات في Supabase';
    } else if (message.includes('timeout') || message.includes('مهلة')) {
      friendlyMessage = 'انتهت مهلة الاتصال — تأكد من صحة كلمة المرور';
    }

    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}

// GET: Check if is_archived columns exist
export async function GET() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdlpvtuplwthqcksaynt.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';

    const tables = ['transactions', 'debts', 'debt_payments', 'currency_exchanges'];
    const results: Record<string, string> = {};
    let allExist = true;

    for (const table of tables) {
      try {
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=is_archived&limit=1`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });

        if (checkResponse.ok) {
          results[table] = '✅ is_archived column exists';
        } else {
          const err = await checkResponse.json();
          if (err.message?.includes('does not exist')) {
            results[table] = '❌ is_archived column MISSING';
            allExist = false;
          } else {
            results[table] = '⚠️ Could not verify: ' + (err.message || 'unknown error');
            allExist = false;
          }
        }
      } catch {
        results[table] = '⚠️ Error checking table';
        allExist = false;
      }
    }

    return NextResponse.json({
      allColumnsExist: allExist,
      results,
      migrationSQL: MIGRATION_SQL.trim(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
