import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Storage Management API
// 🔸 Calculates table sizes, record counts, and chart data
// 🔸 Uses Supabase JS client for reliable data access
// 🔸 Does NOT affect app performance (lightweight queries)
// ============================================

// Hardcoded defaults — safe for server-side use (anon key is publishable)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdlpvtuplwthqcksaynt.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// Tables to monitor
const TABLES = [
  'currencies',
  'vaults',
  'accounts',
  'transactions',
  'debts',
  'debt_payments',
  'currency_exchanges',
  'backups',
] as const;

// Arabic names for tables
const TABLE_NAMES_AR: Record<string, string> = {
  currencies: 'العملات',
  vaults: 'الخزائن',
  accounts: 'الحسابات',
  transactions: 'الحركات',
  debts: 'الديون',
  debt_payments: 'مدفوعات الديون',
  currency_exchanges: 'عمليات الصرافة',
  backups: 'النسخ الاحتياطية',
};

// Table icons (for frontend)
const TABLE_ICONS: Record<string, string> = {
  currencies: 'Currency',
  vaults: 'Vault',
  accounts: 'Users',
  transactions: 'ArrowLeftRight',
  debts: 'HandCoins',
  debt_payments: 'CreditCard',
  currency_exchanges: 'Repeat',
  backups: 'HardDrive',
};

// Supabase free tier: 500MB
const STORAGE_LIMIT_MB = 500;

// Create server-side Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' },
});

interface TableInfo {
  name: string;
  nameAr: string;
  icon: string;
  rowCount: number;
  sizeBytes: number;
  sizeKB: number;
  sizeMB: number;
}

interface MonthlyData {
  month: string;
  monthAr: string;
  transactions: number;
  debts: number;
  exchanges: number;
  total: number;
}

export async function GET() {
  try {
    // 1. Get row counts for all tables using Supabase client
    const tableInfos: TableInfo[] = [];

    for (const table of TABLES) {
      try {
        // Use count: 'exact' to get the total count efficiently
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true });

        const rowCount = error ? 0 : (count || 0);

        // Estimate size: fetch a small sample to calculate average row size
        let sizeBytes = 0;
        if (rowCount > 0) {
          try {
            const sampleSize = Math.min(rowCount, 5);
            const { data: sampleData } = await supabase
              .from(table)
              .select('*')
              .limit(sampleSize);

            if (sampleData && sampleData.length > 0) {
              // Calculate average row size from JSON serialization
              const totalSampleSize = sampleData.reduce(
                (sum, row) => sum + Buffer.byteLength(JSON.stringify(row)),
                0
              );
              const avgRowSize = totalSampleSize / sampleData.length;
              sizeBytes = Math.round(avgRowSize * rowCount);
            }
          } catch {
            // If sampling fails, use rough estimate
            sizeBytes = 500 * rowCount;
          }
        }

        tableInfos.push({
          name: table,
          nameAr: TABLE_NAMES_AR[table] || table,
          icon: TABLE_ICONS[table] || 'Database',
          rowCount,
          sizeBytes,
          sizeKB: Math.round(sizeBytes / 1024 * 100) / 100,
          sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
        });
      } catch {
        tableInfos.push({
          name: table,
          nameAr: TABLE_NAMES_AR[table] || table,
          icon: TABLE_ICONS[table] || 'Database',
          rowCount: 0,
          sizeBytes: 0,
          sizeKB: 0,
          sizeMB: 0,
        });
      }
    }

    // 2. Calculate totals
    const totalSizeBytes = tableInfos.reduce((sum, t) => sum + t.sizeBytes, 0);
    const totalSizeKB = Math.round(totalSizeBytes / 1024 * 100) / 100;
    const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100;
    const totalRows = tableInfos.reduce((sum, t) => sum + t.rowCount, 0);
    const usagePercent = Math.min(Math.round((totalSizeMB / STORAGE_LIMIT_MB) * 10000) / 100, 100);

    // 3. Get monthly chart data (last 6 months)
    const monthlyData: MonthlyData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthName = monthStart.toLocaleDateString('ar-SA', { month: 'long' });
      const monthShort = monthStart.toLocaleDateString('ar-SA', { month: 'short' });

      let txCount = 0;
      let debtCount = 0;
      let exchangeCount = 0;

      try {
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString());
        txCount = count || 0;
      } catch { /* empty */ }

      try {
        const { count } = await supabase
          .from('debts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString());
        debtCount = count || 0;
      } catch { /* empty */ }

      try {
        const { count } = await supabase
          .from('currency_exchanges')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString());
        exchangeCount = count || 0;
      } catch { /* empty */ }

      monthlyData.push({
        month: monthShort,
        monthAr: monthName,
        transactions: txCount,
        debts: debtCount,
        exchanges: exchangeCount,
        total: txCount + debtCount + exchangeCount,
      });
    }

    // 4. Determine alert level
    let alertLevel: 'normal' | 'warning' | 'danger' = 'normal';
    if (usagePercent >= 90) {
      alertLevel = 'danger';
    } else if (usagePercent >= 70) {
      alertLevel = 'warning';
    }

    // 5. Generate suggestions
    const suggestions: Array<{ type: 'archive' | 'delete_old_backups' | 'optimize'; message: string; messageAr: string }> = [];

    if (usagePercent >= 70) {
      suggestions.push({
        type: 'archive',
        message: 'Archive old records to free up space',
        messageAr: 'أرشفة الحركات القديمة لتفريغ المساحة',
      });
    }

    if (usagePercent >= 80) {
      suggestions.push({
        type: 'delete_old_backups',
        message: 'Delete old backups to free up space',
        messageAr: 'حذف النسخ الاحتياطية القديمة لتفريغ المساحة',
      });
    }

    // Always suggest optimization if there are many records
    const largeTable = tableInfos.find(t => t.rowCount > 1000);
    if (largeTable) {
      suggestions.push({
        type: 'optimize',
        message: `Consider archiving old records from ${largeTable.name}`,
        messageAr: `يفضل أرشفة السجلات القديمة من ${largeTable.nameAr}`,
      });
    }

    return NextResponse.json({
      tables: tableInfos,
      totals: {
        sizeBytes: totalSizeBytes,
        sizeKB: totalSizeKB,
        sizeMB: totalSizeMB,
        rowCount: totalRows,
        usagePercent,
        storageLimitMB: STORAGE_LIMIT_MB,
      },
      chartData: monthlyData,
      alertLevel,
      suggestions,
    });
  } catch (error) {
    console.error('[Storage API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch storage data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
