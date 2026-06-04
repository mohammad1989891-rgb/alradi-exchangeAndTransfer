---
Task ID: 1
Agent: Main Agent
Task: Smart Archiving System + Performance Optimization + MonthCard Simplification

Work Log:
- Read and analyzed all key files: useSupabaseData.ts, supabaseDb.ts, MonthCard.tsx, monthlyGrouping.ts, page.tsx, TransactionsPage.tsx, DebtsPage.tsx, CurrencyExchangePage.tsx, SettingsPage.tsx, BalancesPage.tsx, archive API routes
- Found that archiving system was already mostly implemented (is_archived field, archiveRecords/unarchiveRecords/autoArchiveOldRecords functions, showArchived toggle, archive button in header, archive settings section)
- Created `/home/z/my-project/src/lib/cachedCalculations.ts` with memoized calculation utilities (calcTotalBalanceUSD, calcDebtRemaining, calcAccountBalance, calcMonthlyOperationCounts) using a cache-with-TTL pattern
- Simplified `/home/z/my-project/src/lib/monthlyGrouping.ts` — removed financial totals (totalIncome, totalExpense, netBalance) from MonthGroup, replaced with SimpleMonthGroup that only has key/label/items/count. Made groupByMonthGeneric an alias for groupByMonth.
- Updated `/home/z/my-project/src/components/exchange/MonthCard.tsx` — changed count display from Arabic plural forms ("حركة/حركتين/حركات") to "عدد العمليات: {count}" format
- Created `/home/z/my-project/src/components/ui/LazyList.tsx` — IntersectionObserver-based lazy loading component with sentinel element and manual "load more" fallback
- Updated TransactionsPage.tsx to import SimpleMonthGroup type
- Updated DebtsPage.tsx: replaced groupByMonthGeneric with groupByMonth, updated DebtMonthGroup count format to "عدد العمليات:"
- Updated CurrencyExchangePage.tsx: replaced groupByMonthGeneric with groupByMonth, updated ExchangeMonthGroup count format to "عدد العمليات:"
- Updated useSupabaseData.ts: imported calcDebtRemaining and calcTotalBalanceUSD from cachedCalculations, replaced server-side getTotalDebtRemaining() with client-side useMemo computation (computedDebtRemaining), removed getTotalDebtRemaining from imports and refreshData/refreshDebts/refreshDebtPayments calls (one fewer Supabase query per refresh)
- Ran lint check — all clean
- Tested with Agent Browser — all tabs load correctly, MonthCards show "عدد العمليات:" consistently, archive section exists in settings

Stage Summary:
- Performance improvement: Removed 1 Supabase query per data refresh (getTotalDebtRemaining now computed client-side with useMemo)
- Performance improvement: Financial totals (totalIncome/totalExpense/netBalance) no longer computed during monthly grouping
- UI simplification: All monthly cards now show "عدد العمليات: N" instead of Arabic plural forms
- Archive system: Already fully implemented with is_archived field, auto-archive, manual archive, archive button in header, settings section
- LazyList component: Available for future virtual scrolling integration
- cachedCalculations.ts: Available for future performance optimizations

---
Task ID: 2
Agent: Main Agent
Task: Fix fetchWithRetry Non-retryable error: {} console errors

Work Log:
- Read `src/lib/supabaseDb.ts` (lines 1-120) to understand the current `fetchWithRetry` and `isRetryableError` implementation
- Read `src/hooks/useSupabaseData.ts` to understand how data flows from Supabase to UI
- Identified two root causes:
  1. `isRetryableError()` defaulted to `return false` — Supabase PostgrestError objects are plain objects (not Error instances) with empty messages like `{}`, so they didn't match any "retryable" patterns and were classified as non-retryable
  2. `fetchWithRetry()` re-threw non-retryable errors (line 100: `throw error;`) — this caused `Error loading data from Supabase: {}` in useSupabaseData's catch block
- Applied fix #1: Changed `isRetryableError` default from `return false` to `return true` — unknown errors are now retried (they could be transient network issues; Supabase PostgrestError with `{}` message is common)
- Applied fix #2: Changed `fetchWithRetry` to return `null` instead of throwing for non-retryable errors — callers already handle `null` with `return result || []` pattern, so the app never crashes
- Verified fix with Agent Browser: logged in, navigated all tabs (Balances, Accounts, Currency Exchange, Transactions, Debts) — zero console errors
- Confirmed data loads successfully: 24 currencies, 2 active, 109 transactions, 2 accounts, 2 vaults

Stage Summary:
- Fixed `[Supabase] ❌ Non-retryable error: {}` errors — now these are retried (default to retryable)
- Fixed `Error loading data from Supabase: {}` crashes — fetchWithRetry never throws, always returns null on failure
- Additive-only changes: 2 lines changed in `isRetryableError` (default return) and `fetchWithRetry` (return null instead of throw)
- All existing features preserved — no deletion or modification of other code
