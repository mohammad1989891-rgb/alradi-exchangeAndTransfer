# Task 3: Opening Balance System Implementation

## Agent: Main Agent
## Date: 2026-03-05

## Summary
Implemented the Opening Balance System with `recalculateVaultBalance()` for the الراضي للصرافة والحوالات app. This replaces the imperative balance tracking system with a calculated approach: `balance = opening_balance + sum(post-date operations)`.

## Key Changes

### Database
- Added `opening_balance_date TIMESTAMPTZ` column to vaults table in Supabase via Management API
- Updated Prisma schema and ran `bun run db:push`

### Core Logic (src/lib/supabaseDb.ts)
- Created `recalculateVaultBalance(currencyId)` - the central balance calculation function
- Replaced ALL imperative vault balance updates (11 functions) with calls to recalculateVaultBalance()
- Updated `updateVaultOpeningBalance()` to accept optional `openingBalanceDate` parameter
- Updated `updateVaultBalance()` to be a deprecated wrapper that calls recalculateVaultBalance()
- Added `recalculateAllVaultBalances()` for post-import consistency
- Updated `importAllData()` to call recalculateAllVaultBalances() after import
- Updated `clearAllData()` to reset opening_balance_date to null

### UI Changes
- **OpeningBalanceModal**: Added date picker (Calendar + Popover), displays current opening balance date
- **VaultCard**: Shows "منذ yyyy/MM/dd" below opening balance when date is set

### Hook Changes (src/hooks/useSupabaseData.ts)
- `updateVaultOpeningBalance` now accepts `(currencyId, balance, date?)`
- Added `recalculateVaultBalance` exposed function

### Type Changes
- Vault interface: added `openingBalanceDate: Date | null`
- AccountVault interface: added `openingBalanceDate: Date | null`

## Verification
- Lint: passes with no errors
- Build: succeeds
- Dev server: compiles and serves pages correctly
