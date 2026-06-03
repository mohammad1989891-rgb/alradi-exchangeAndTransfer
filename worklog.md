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
