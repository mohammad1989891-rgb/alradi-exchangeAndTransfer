# Task 5: Fix Debt Calculation Logic - Separate by Currency

## Summary
Fixed critical accounting bug where debts in different currencies were incorrectly summed together (e.g., USD 1000 + SYP 1,500,000 shown as single combined number). Added per-currency breakdown throughout the debt calculation and display pipeline.

## Files Modified
1. `/home/z/my-project/src/lib/supabaseDb.ts` - Added CurrencyDebtSummary interface, updated AccountDebtSummary, updated getAccountDebtSummary()
2. `/home/z/my-project/src/lib/localDb.ts` - Added same CurrencyDebtSummary and updated getAccountDebtSummary() for consistency
3. `/home/z/my-project/src/components/exchange/DebtsPage.tsx` - Added CurrencyCumulativeSummary, updated calculateCumulativeSummary(), fixed hardcoded cur_usd, updated all display sections

## Key Changes
- All debt calculations now group by currencyId first
- Per-currency breakdown available in AccountDebtSummary.currencyBreakdown and CumulativeAccountSummary.currencyBreakdown
- Hardcoded `cur_usd` replaced with unpaidDebt.currencyId in overflow transactions
- All hardcoded `$` symbols replaced with actual currency symbols via getCurrencySymbol() helper
- Backward compatibility maintained with existing global total fields

## Verification
- `bun run lint` passes with no errors
