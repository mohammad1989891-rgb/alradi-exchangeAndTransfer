import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Execute SQL via Supabase pg package
// 🔸 Accepts SQL and optional dbPassword
// 🔸 Uses pg package to execute DDL statements directly
// 🔸 Falls back to providing SQL for manual execution
// ============================================

const PROJECT_REF = 'hdlpvtuplwthqcksaynt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sql, dbPassword } = body;

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'لم يتم تقديم SQL للتنفيذ',
      }, { status: 400 });
    }

    // If dbPassword is provided, use pg to execute SQL directly
    if (dbPassword) {
      return await executeWithPg(sql, dbPassword);
    }

    // No password provided — provide SQL for manual execution
    return NextResponse.json({
      success: false,
      needsPassword: true,
      sql: sql,
      note: 'لا يمكن تنفيذ SQL تلقائياً بدون كلمة مرور قاعدة البيانات. أدخل كلمة مرور قاعدة البيانات أو قم بتشغيل SQL يدوياً في Supabase SQL Editor.',
    });

  } catch (error) {
    console.error('Execute SQL error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function tryConnectAndExecute(sql: string, config: Record<string, unknown>): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client(config);

  try {
    const connectPromise = client.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), 15000);
    });
    await Promise.race([connectPromise, timeoutPromise]);

    // Execute the SQL
    await client.query(sql);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

async function executeWithPg(sql: string, dbPassword: string): Promise<NextResponse> {
  try {
    // ✅ Use connection parameters object instead of URL string
    // This avoids all URL parsing issues with special characters in the password

    // Config 1: Direct connection (best for DDL statements like CREATE TABLE)
    const directConfig = {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
    };

    // Config 2: Pooler connection (fallback)
    const poolerConfig = {
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
    };

    let lastError: Error | null = null;

    // Try direct connection first (more reliable for DDL)
    try {
      await tryConnectAndExecute(sql, directConfig);
      return NextResponse.json({
        success: true,
        message: 'تم تنفيذ SQL بنجاح ✓',
      });
    } catch (directError) {
      lastError = directError instanceof Error ? directError : new Error('Direct connection failed');
      console.warn('Direct connection failed, trying pooler...', lastError.message);
    }

    // Fallback to pooler connection
    try {
      await tryConnectAndExecute(sql, poolerConfig);
      return NextResponse.json({
        success: true,
        message: 'تم تنفيذ SQL بنجاح ✓',
      });
    } catch (poolerError) {
      lastError = poolerError instanceof Error ? poolerError : new Error('Pooler connection failed');
      console.warn('Pooler connection also failed:', lastError.message);
    }

    // Both connections failed
    throw lastError || new Error('فشل الاتصال');

  } catch (pgError) {
    const pgMessage = pgError instanceof Error ? pgError.message : 'Unknown error';
    let friendlyMessage = pgMessage;
    if (pgMessage.includes('Invalid URL') || pgMessage.includes('invalid url')) {
      friendlyMessage = 'كلمة مرور قاعدة البيانات تحتوي على أحرف غير مدعومة. تأكد من صحة كلمة المرور.';
    } else if (pgMessage.includes('password authentication failed') || pgMessage.includes('SASL')) {
      friendlyMessage = 'كلمة مرور قاعدة البيانات غير صحيحة — تأكد من أنها كلمة مرور قاعدة البيانات (Database Password) وليس كلمة مرور الحساب';
    } else if (pgMessage.includes('ENOTFOUND') || pgMessage.includes('tenant/user') || pgMessage.includes('pooler')) {
      friendlyMessage = 'فشل الاتصال — تأكد من صحة كلمة مرور قاعدة البيانات';
    } else if (pgMessage.includes('مهلة الاتصال') || pgMessage.includes('timeout') || pgMessage.includes('ETIMEDOUT')) {
      friendlyMessage = 'انتهت مهلة الاتصال — تأكد من صحة كلمة المرور وأن قاعدة البيانات متاحة';
    } else if (pgMessage.includes('3D000') || pgMessage.includes('database')) {
      friendlyMessage = 'قاعدة البيانات غير موجودة';
    } else if (pgMessage.includes('ECONNREFUSED')) {
      friendlyMessage = 'تم رفض الاتصال — تأكد من أن قاعدة البيانات نشطة في Supabase';
    }
    return NextResponse.json({
      success: false,
      error: friendlyMessage,
      sql,
      note: 'فشل الاتصال المباشر بقاعدة البيانات. يمكنك تشغيل SQL يدوياً في Supabase SQL Editor.',
    });
  }
}
