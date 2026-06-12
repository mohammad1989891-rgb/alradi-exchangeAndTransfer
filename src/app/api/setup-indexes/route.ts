import { NextRequest, NextResponse } from 'next/server';

// SQL statements for creating indexes
const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON transactions(currency_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_debts_date ON debts(date DESC);
CREATE INDEX IF NOT EXISTS idx_debts_account_id ON debts(account_id);
CREATE INDEX IF NOT EXISTS idx_debts_debt_type ON debts(debt_type);
CREATE INDEX IF NOT EXISTS idx_debts_is_paid ON debts(is_paid);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(date DESC);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_date ON currency_exchanges(date DESC);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_is_deleted ON currency_exchanges(is_deleted);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vehicle_id ON vehicle_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_date ON vehicle_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_partner ON vehicle_transactions(partner);
CREATE INDEX IF NOT EXISTS idx_shared_transactions_date ON shared_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_shared_transactions_partner ON shared_transactions(partner);
`;

const SUPABASE_REGIONS = [
  'aws-0-us-east-1',
  'aws-0-us-east-2',
  'aws-0-us-west-1',
  'aws-0-us-west-2',
  'aws-0-eu-central-1',
  'aws-0-eu-west-1',
  'aws-0-eu-west-2',
  'aws-0-eu-west-3',
  'aws-0-ap-southeast-1',
  'aws-0-ap-northeast-1',
  'aws-0-ap-northeast-2',
  'aws-0-ap-south-1',
  'aws-0-sa-east-1',
  'aws-0-ca-central-1',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbPassword, region: providedRegion } = body;

    if (!dbPassword) {
      return NextResponse.json(
        { error: 'كلمة مرور قاعدة البيانات مطلوبة' },
        { status: 400 }
      );
    }

    // Dynamically import postgres
    const { default: postgres } = await import('postgres');

    const projectRef = 'hdlpvtuplwthqcksaynt';
    let sql: ReturnType<typeof postgres> | null = null;
    let connectedRegion = '';

    // If region is provided, try it directly
    if (providedRegion) {
      try {
        sql = postgres({
          host: `${providedRegion}.pooler.supabase.com`,
          port: 6543,
          database: 'postgres',
          username: `postgres.${projectRef}`,
          password: dbPassword,
          ssl: 'require',
          connect_timeout: 10,
        });
        await sql`SELECT 1 as test`;
        connectedRegion = providedRegion;
      } catch {
        if (sql) await sql.end();
        sql = null;
      }
    }

    // Auto-detect region if not provided or failed
    if (!sql) {
      for (const region of SUPABASE_REGIONS) {
        try {
          const testSql = postgres({
            host: `${region}.pooler.supabase.com`,
            port: 6543,
            database: 'postgres',
            username: `postgres.${projectRef}`,
            password: dbPassword,
            ssl: 'require',
            connect_timeout: 8,
          });

          await testSql`SELECT 1 as test`;
          sql = testSql;
          connectedRegion = region;
          break;
        } catch {
          // Try next region
          continue;
        }
      }
    }

    if (!sql) {
      return NextResponse.json(
        { error: 'لم يتم الاتصال بقاعدة البيانات. تحقق من كلمة المرور أو حدد المنطقة يدوياً.' },
        { status: 500 }
      );
    }

    // Execute index creation
    const results: { index: string; status: string; error?: string }[] = [];
    const statements = INDEX_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      try {
        await sql.unsafe(statement);
        results.push({ index: indexName, status: '✅' });
      } catch (err: unknown) {
        const error = err as Error;
        results.push({ index: indexName, status: '❌', error: error.message });
      }
    }

    await sql.end();

    const successCount = results.filter(r => r.status === '✅').length;
    const failCount = results.filter(r => r.status === '❌').length;

    return NextResponse.json({
      success: true,
      region: connectedRegion,
      message: `تم إنشاء ${successCount} فهرس بنجاح${failCount > 0 ? `، فشل ${failCount}` : ''} في منطقة ${connectedRegion}`,
      results,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
