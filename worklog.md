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
