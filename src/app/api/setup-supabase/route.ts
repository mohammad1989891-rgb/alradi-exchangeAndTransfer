import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseUrl, dbPassword } = body;

    // Build the connection string
    let connectionString = databaseUrl;

    // If only password is provided, construct the Supabase pooler URL
    if (!connectionString && dbPassword) {
      const projectRef = 'hdlpvtuplwthqcksaynt';
      connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
    }

    if (!connectionString) {
      return NextResponse.json(
        { error: 'يجب تقديم كلمة مرور قاعدة البيانات أو سلسلة الاتصال' },
        { status: 400 }
      );
    }

    // Read the migration SQL
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const migrationPath = join(process.cwd(), 'supabase', 'migration.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Use pg to execute the migration with timeout
    const { Client } = await import('pg');

    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      // Add connection timeout to prevent hanging
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
    });

    try {
      // Connect with timeout wrapper
      const connectPromise = client.connect();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال — تأكد من أن قاعدة البيانات متاحة وكلمة المرور صحيحة')), 15000);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Execute the migration
      await client.query(sql);

      // Verify tables were created
      const { rows } = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      await client.end();

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        tables: rows.map((r: { table_name: string }) => r.table_name),
      });
    } catch (dbError) {
      // Force close the connection to prevent hanging/crashing
      try {
        // Set a short timeout for cleanup
        const endPromise = client.end();
        const cleanupTimeout = new Promise<void>((resolve) => setTimeout(() => resolve(), 3000));
        await Promise.race([endPromise, cleanupTimeout]);
      } catch {}
      throw dbError;
    }
  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';

    // Provide user-friendly Arabic error messages
    let friendlyMessage = message;
    if (message.includes('ENOTFOUND') || message.includes('tenant/user')) {
      friendlyMessage = 'فشل الاتصال — تأكد من صحة كلمة مرور قاعدة البيانات';
    } else if (message.includes('ECONNREFUSED')) {
      friendlyMessage = 'رفض الاتصال — تأكد من أن قاعدة البيانات متاحة';
    } else if (message.includes('password authentication failed')) {
      friendlyMessage = 'كلمة المرور غير صحيحة — تحقق من كلمة مرور قاعدة البيانات في Supabase';
    } else if (message.includes('3D000') || message.includes('database')) {
      friendlyMessage = 'قاعدة البيانات غير موجودة — تحقق من اسم قاعدة البيانات';
    } else if (message.includes('مهلة الاتصال') || message.includes('timeout')) {
      friendlyMessage = 'انتهت مهلة الاتصال — تأكد من صحة كلمة المرور وأن قاعدة البيانات متاحة';
    }

    return NextResponse.json(
      { error: friendlyMessage },
      { status: 500 }
    );
  }
}

// GET: Return the SQL migration content for manual execution
export async function GET() {
  try {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const migrationPath = join(process.cwd(), 'supabase', 'migration.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    return NextResponse.json({ sql });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read migration file' },
      { status: 500 }
    );
  }
}
