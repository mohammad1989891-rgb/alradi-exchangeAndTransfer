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
