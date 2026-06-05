---
Task ID: 1
Agent: Main Agent
Task: Add edit functionality for debt movements and payment transactions in "Show All Movements" modal

Work Log:
- Analyzed codebase structure: DebtsPage.tsx, DebtModal.tsx, supabaseDb.ts, useSupabaseData.ts
- Created `editDebtWithVaultReversal()` function in supabaseDb.ts - reverses old debt vault effect, updates debt record, applies new vault effect
- Created `editDebtPaymentWithVaultReversal()` function in supabaseDb.ts - reverses old payment vault effect, updates payment record, applies new vault effect
- Added wrapper functions in useSupabaseData.ts hook for both edit functions
- Created EditMovementModal.tsx component with full edit forms for both debts and payments
- Integrated long press (500ms) and right-click context menu on movement cards in DebtsPage.tsx
- Added edit button (✏️ تعديل) alongside delete button on each movement card
- Added long press context menu dialog with edit/delete options
- Added EditMovementModal component at the bottom of DebtsPage
- Vault logic follows user's spec: لنا+كاش→deduct, لنا+آجل→no effect, علينا+كاش→add, علينا+آجل→no effect
- Currency-specific vault updates (same currency only, no cross-currency)
- Added vault reversal notice in edit modal
- Added isPaid recalculation after edit
- Lint passes with no errors
- Dev server compiles and serves successfully (HTTP 200)

Stage Summary:
- 3 files modified: supabaseDb.ts, useSupabaseData.ts, DebtsPage.tsx
- 1 new file: EditMovementModal.tsx
- All vault reversal logic implemented with proper accounting
- Long press + right-click + edit button all trigger edit modal
- UI Freeze maintained - same design patterns as existing DebtModal
