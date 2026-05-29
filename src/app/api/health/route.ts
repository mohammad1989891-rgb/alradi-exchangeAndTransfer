import { NextResponse } from 'next/server';

/**
 * API Health Check for Supabase connectivity
 * Can be called from any device to verify Supabase connection
 * GET /api/health
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Check if env vars are configured
  const envStatus: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'Set (' + supabaseUrl + ')' : 'Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Set (' + supabaseAnonKey.substring(0, 10) + '...)' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? 'Set (' + serviceRoleKey.substring(0, 10) + '...)' : 'Not set (optional)',
  };

  // If no URL or key, return early
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      status: 'error',
      message: 'Supabase environment variables are not configured',
      env: envStatus,
      hint: 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local',
    }, { status: 500 });
  }

  // Test Supabase REST API connectivity
  const testResults: Record<string, { status: string; count?: number; error?: string }> = {};

  const tables = [
    'currencies', 'vaults', 'accounts', 'transactions',
    'debts', 'debt_payments', 'currency_exchanges', 'users',
    'vehicles', 'vehicle_transactions', 'shared_transactions', 'vehicles_settings'
  ];

  for (const table of tables) {
    try {
      const url = supabaseUrl + '/rest/v1/' + table + '?select=id&limit=1';
      const res = await fetch(url, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: 'Bearer ' + supabaseAnonKey,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        testResults[table] = { status: 'OK', count: Array.isArray(data) ? data.length : 0 };
      } else {
        const errorText = await res.text();
        testResults[table] = { status: 'Error', error: res.status + ': ' + errorText.substring(0, 100) };
      }
    } catch (err) {
      testResults[table] = { status: 'Failed', error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  const allOk = Object.values(testResults).every(r => r.status === 'OK');

  return NextResponse.json({
    status: allOk ? 'ok' : 'partial',
    message: allOk
      ? 'All Supabase tables are accessible from this server'
      : 'Some tables are not accessible - check RLS policies',
    env: envStatus,
    tables: testResults,
    timestamp: new Date().toISOString(),
  });
}
