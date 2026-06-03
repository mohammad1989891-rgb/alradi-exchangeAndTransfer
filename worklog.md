---
Task ID: 1
Agent: Main Agent
Task: Fix Supabase integration - handle missing tables gracefully and improve app resilience

Work Log:
- Cleaned Next.js build cache (.next directory) to fix ChunkLoadError
- Analyzed the full Supabase integration architecture (supabaseDb.ts, useSupabaseData.ts, page.tsx, SupabaseSetup.tsx)
- Attempted to create Supabase tables programmatically (PostgreSQL direct connection, pooler, Management API, CLI)
- All direct database connections are blocked from the sandbox environment (port 5432 and 6543 unreachable)
- The Supabase Management API requires a personal access token (not the service role key)
- Modified supabaseDb.ts to add `tablesExist` flag and graceful error handling when tables don't exist
- Modified useSupabaseData.ts to check tables existence before subscribing to Realtime
- Modified page.tsx to properly detect missing tables and show SupabaseSetup component
- Updated next.config.ts to add the preview origin to allowedDevOrigins
- Updated setup-supabase API route with connection timeout and better error handling
- All getter functions in supabaseDb.ts now return empty arrays/0/null when tables don't exist
- The app will show the SupabaseSetup component when Supabase tables are missing
- The user can enter their database password in the SupabaseSetup component to create tables automatically
- Lint passes with no errors

Stage Summary:
- The app now gracefully handles missing Supabase tables
- When tables don't exist, the SupabaseSetup component is shown with two options:
  1. One-click setup (enter database password)
  2. Manual SQL setup (copy SQL and run in Supabase SQL editor)
- All 23 getter functions in supabaseDb.ts have `if (!tablesExist)` guards
- Realtime subscriptions are skipped when tables don't exist
- The ChunkLoadError should be resolved by clearing the .next cache and refreshing the browser

---
Task ID: 2
Agent: Main Agent
Task: Fix cross-device data sync - RLS policies, debug logging, diagnostics API

Work Log:
- Created supabase/fix-rls.sql with SQL to disable RLS or add permissive policies on all 12 tables
- Updated supabase/migration.sql with safer RLS policy creation (DROP POLICY IF EXISTS + CREATE POLICY instead of DO $$ block)
- Added detailed console logging to src/lib/supabase.ts for cross-device debugging (URL, key prefix, fix hints)
- Added console logging to src/lib/supabaseDb.ts for checkTablesExist, initializeDatabase, and all getter functions
- Added RLS-specific error detection in checkTablesExist and initializeDatabase with fix hints
- Created /api/debug-supabase endpoint that tests: env vars, anon key connection, service role connection, and provides fix steps
- Pushed all changes to GitHub with new token
- Verified dev server runs correctly, debug API returns successful connection test

Stage Summary:
- fix-rls.sql provides two options: disable RLS entirely or add permissive policies
- migration.sql now uses DROP IF EXISTS for safe re-runs
- Debug API at /api/debug-supabase helps diagnose: missing env vars, RLS blocking, network issues
- Local test shows Supabase connection is working (anon key + service role both succeed)
- The most likely cause for "no data on other devices" is missing NEXT_PUBLIC_ env vars on deployment platform
- User needs to: (1) Set env vars on Vercel, (2) Run fix-rls.sql in Supabase SQL Editor, (3) Redeploy

---
Task ID: 1
Agent: main
Task: Fix debt payment modal issues - amount reset to 0 and exchange rate visibility

Work Log:
- Analyzed MultiCurrencyPaymentModal.tsx (918 lines) to understand the payment dialog logic
- Identified root cause: useEffect on line 208-234 had too many dependencies (currenciesWithDebt, getCurrencyRemainingDebt) causing it to re-run and reset form state on every data change
- Fixed amount reset: Changed useEffect to only run when isOpen changes, using useRef (prevIsOpenRef) to detect modal open/close transitions
- Added separate useEffect for updating remaining debt in allocations without resetting user inputs
- Fixed exchange rate visibility: Added reactive effect that updates exchange rates when payment currency changes, using prevPaymentCurrencyIdRef to detect actual currency changes vs re-renders
- Added display maps (allocationDisplayMap, exchangeRateDisplayMap) to preserve user typing state (e.g., "100." without losing the decimal point)
- Added input validation: prevent non-numeric input, prevent multiple decimal points
- Never overwrite user-entered values with calculated values
- Browser verification confirmed: amount stays when typed, exchange rate field appears when currency differs, cross-rate auto-calculates correctly

Stage Summary:
- All 5 user-reported issues fixed:
  1. ✅ Amount no longer resets to 0 - separated input state from calculated state
  2. ✅ Exchange rate field appears when payment currency differs from debt currency
  3. ✅ Reactive UI updates when currency changes
  4. ✅ No calculation conflicts - user input never overwritten
  5. ✅ Input validation prevents empty/text input
- Pushed to GitHub (commit f40c6ab)
