---
Task ID: 1
Agent: Main Agent
Task: Improve debt transaction editing experience in "عرض جميع الحركات" window

Work Log:
- Read and analyzed DebtsPage.tsx - found long press handler and options dialog
- Read and analyzed EditMovementModal.tsx - found existing edit modal with different design
- Read and analyzed MultiCurrencyPaymentModal.tsx - understood target design pattern
- Read and analyzed supabaseDb.ts - verified editDebtWithVaultReversal and editDebtPaymentWithVaultReversal functions
- Modified DebtsPage.tsx:
  - Changed handleLongPressStart to directly call handleEditMovement (no options dialog)
  - Removed longPressedMovement state variable
  - Removed Long Press Context Menu dialog (خيارات الدين/الدفعة)
  - Kept edit/delete buttons on each movement card for quick access
- Redesigned EditMovementModal.tsx to match MultiCurrencyPaymentModal:
  - Added Account Info Header with direction/mode badges
  - Changed toggle buttons to match payment modal style (teal for CASH, purple for DEFERRED)
  - Changed toggle button layout from py-4 to py-3 with smaller icons (matching payment modal)
  - Added currency symbol overlay inside amount input (matching payment modal)
  - Separated amount and currency into distinct sections (matching payment modal layout)
  - Added CreditCard icon for payment edit modal title (matching payment modal)
  - Kept vault reversal notice and calculated balance sections
  - Kept all accounting logic unchanged (reverse + apply pattern)

Stage Summary:
- Long press now directly opens edit modal (0 extra clicks)
- No options dialog appears on long press
- Edit modal design unified with "تسديد الديون" (MultiCurrencyPaymentModal) style
- All accounting logic preserved (vault reversal, direction-based effects)
- UI Freeze maintained - no changes to overall app design
- Lint check passes, TypeScript compilation passes for modified files
- Dev server runs and compiles successfully with changes

---
Task ID: 2
Agent: Main Agent
Task: Separate debt display by currency on main page (BalancesPage) - no cross-currency merging

Work Log:
- Analyzed BalancesPage.tsx - found all debt amounts merged into single $ values
- Analyzed cachedCalculations.ts - found calcDebtRemaining() sums across all currencies
- Analyzed useSupabaseData.ts, useLocalData.ts, localDb.ts - all needed currencyBreakdown
- Added CurrencyDebtBreakdown interface to cachedCalculations.ts
- Added currencyBreakdown field to DebtRemainingResult interface
- Modified calcDebtRemaining() to build currencyMap and compute per-currency totals
- Updated EMPTY_DEBT_REMAINING with currencyBreakdown: []
- Updated DebtRemaining interface in useSupabaseData.ts + re-exported CurrencyDebtBreakdown
- Updated useLocalData.ts debtRemaining state type with currencyBreakdown
- Updated localDb.ts getTotalDebtRemaining() return type and logic with currencyBreakdown
- Completely rewrote BalancesPage.tsx debt section:
  - Assets card (لنا): shows each currency's remaining amount separately
  - Liabilities card (علينا): shows each currency's remaining amount separately
  - Net debt card: shows each currency's net balance separately
  - Details section: shows per-currency breakdown with الإجمالي/المدفوع/المتبقي and نقدي/آجل split
- Removed all merged single-value displays (no more "1,500 $" combining USD+SYP+etc)
- Each currency is displayed with its own symbol (e.g., $, ل.س, ر.س)

Stage Summary:
- Each currency displayed independently on main page debt cards
- No cross-currency merging or conversion
- Per-currency breakdown available in detailed view
- All data sources (Supabase + Local) include currencyBreakdown
- TypeScript compilation passes for all modified files
- ESLint passes with no errors
- Dev server compiles and runs successfully

---
Task ID: 1
Agent: main
Task: Move debt summary and details from BalancesPage to ReportsPage (إحصائيات الديون)

Work Log:
- Explored codebase: page.tsx, BalancesPage.tsx, ReportsPage.tsx, useSupabaseData.ts
- Identified BalancesPage.tsx (lines 162-408) contained the debt section to move
- Removed debt summary (ملخص الديون), debt details (تفاصيل الديون), and net debt card from BalancesPage.tsx
- Cleaned up BalancesPage imports: removed useState, AnimatePresence, TrendingUp, ChevronDown, ChevronUp, HandCoins, Scale
- Fixed TrendingUp reference in balance card header → replaced with DollarSign
- Removed unused data variables: debtRemaining, transactions, debts, debtPayments, netDeferredDebts, currencyMap, receivableByCurrency, payableByCurrency, netByCurrency
- Added debtRemaining to ReportsPage useSupabaseData destructuring
- Added showDebtDetails state to ReportsPage
- Added debt currency breakdown logic (debtCurrencyMap, receivableByCurrency, payableByCurrency, netByCurrency) with useMemo
- Expanded existing إحصائيات الديون section in ReportsPage to include:
  - Section header with expand/collapse button for details
  - القسم الأول: ملخص الديون (assets + liabilities + net debt cards per currency)
  - القسم الثاني: تفاصيل الديون (expandable AnimatePresence details per currency)
  - Separator then existing overdue/long-term statistics
- Added imports: AnimatePresence, ChevronDown, ChevronUp, Button
- Verified: lint passes, TypeScript compiles (no errors in modified files), dev server runs cleanly
- Committed: 3ce9f0a "refactor: move debt summary and details from balances page to reports page"
- Pushed to GitHub

Stage Summary:
- BalancesPage is now lighter — only shows total balance + vault cards
- ReportsPage now contains comprehensive إحصائيات الديون section with all debt data
- Multi-currency support preserved (no cross-currency mixing)
- Real-time updates work via useSupabaseData hook
- UI Freeze maintained — identical visual design, only location changed
