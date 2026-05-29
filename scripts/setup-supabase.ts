// Setup script to create Supabase tables
// Run with: bun run scripts/setup-supabase.ts

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

async function runMigration() {
  console.log('🚀 Starting Supabase database migration...\n');

  const migrationPath = join(import.meta.dir, '..', 'supabase', 'migration.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Check for DATABASE_URL
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('❌ SUPABASE_DATABASE_URL environment variable is not set.');
    console.log('\n📋 Please provide the Supabase database connection string.');
    console.log('You can find it at:');
    console.log('  https://supabase.com/dashboard/project/hdlpvtuplwthqcksaynt/settings/database');
    console.log('\nFormat: postgresql://postgres.hdlpvtuplwthqcksaynt:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres');
    console.log('\nThen run:');
    console.log('  SUPABASE_DATABASE_URL="your-connection-string" bun run scripts/setup-supabase.ts');
    process.exit(1);
  }

  console.log('🔌 Connecting to Supabase database...\n');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase database\n');

    // Execute the entire migration as a single transaction
    console.log('📝 Executing migration SQL...\n');
    await client.query('BEGIN');
    
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Verify tables were created
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    for (const row of rows) {
      console.log(`  - ${row.table_name}`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
