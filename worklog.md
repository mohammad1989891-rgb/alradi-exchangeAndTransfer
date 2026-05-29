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
