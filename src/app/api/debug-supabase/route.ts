import { NextResponse } from 'next/server';

/**
 * Debug endpoint for diagnosing Supabase connectivity issues.
 * Returns environment variable status, connection test results, and table check.
 * Useful for troubleshooting "no data on other devices" issues.
 */
export async function GET() {
  const debug: Record<string, unknown> = {};

  // 1. Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  debug.envVars = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '(MISSING)',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '(MISSING)',
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? 'present (hidden)' : '(MISSING)',
    allPresent: !!(supabaseUrl && supabaseAnonKey),
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    debug.error = 'Environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
    debug.fix = 'On Vercel: go to Settings → Environment Variables and add the missing variables, then redeploy.';
    return NextResponse.json(debug, { status: 200 });
  }

  // 2. Test direct connection to Supabase REST API
  try {
    const startTime = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/currencies?select=id&limit=1`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    const elapsed = Date.now() - startTime;

    debug.connectionTest = {
      status: res.status,
      statusText: res.statusText,
      elapsedMs: elapsed,
      ok: res.ok,
    };

    if (res.ok) {
      const data = await res.json();
      debug.connectionTest.data = data;
      debug.connectionTest.message = '✅ Connection successful! Data is accessible.';
    } else {
      const errorText = await res.text();
      debug.connectionTest.error = errorText;

      if (res.status === 401 || res.status === 403) {
        debug.connectionTest.message = '❌ RLS is blocking access. Run fix-rls.sql in Supabase SQL Editor.';
        debug.connectionTest.fix = 'Go to Supabase SQL Editor and run the fix-rls.sql script to disable RLS or add permissive policies.';
      } else {
        debug.connectionTest.message = `❌ HTTP ${res.status}: ${errorText}`;
      }
    }
  } catch (err) {
    debug.connectionTest = {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      message: '❌ Cannot connect to Supabase. Check network or URL.',
    };
  }

  // 3. Test with service role key (bypasses RLS)
  if (serviceRoleKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/currencies?select=id&limit=1`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      debug.serviceRoleTest = {
        status: res.status,
        ok: res.ok,
        message: res.ok
          ? '✅ Service role key works (bypasses RLS). If anon key fails but this works, RLS is the problem.'
          : `❌ Service role key also failed: ${res.status}`,
      };

      if (res.ok) {
        const data = await res.json();
        debug.serviceRoleTest.dataCount = data?.length ?? 0;
      }
    } catch (err) {
      debug.serviceRoleTest = {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // 4. Summary and recommendations
  const connOk = (debug.connectionTest as Record<string, unknown>)?.ok === true;
  const srOk = (debug.serviceRoleTest as Record<string, unknown>)?.ok === true;

  if (connOk) {
    debug.summary = '✅ Supabase connection is working correctly. If data is still not showing, check browser console for errors.';
  } else if (srOk && !connOk) {
    debug.summary = '❌ RLS is blocking the anon key. FIX: Run fix-rls.sql in Supabase SQL Editor to disable RLS or add permissive policies.';
    debug.fixSteps = [
      '1. Go to: https://supabase.com/dashboard/project/hdlpvtuplwthqcksaynt/sql',
      '2. Copy the contents of supabase/fix-rls.sql',
      '3. Paste it in the SQL Editor',
      '4. Click RUN',
      '5. Refresh your app',
    ];
  } else if (!supabaseUrl || !supabaseAnonKey) {
    debug.summary = '❌ Environment variables are missing. The app cannot connect to Supabase.';
  } else {
    debug.summary = '❌ Cannot connect to Supabase at all. Check your URL and network.';
  }

  return NextResponse.json(debug, { status: 200 });
}
