# Task 5-B: Build SaleDialog + SalesPage components

## Agent: Frontend Subagent B

## Task
Create two new client components for the "Purchases & Sales" feature of the RTL Arabic Next.js 16 exchange app at `/home/z/my-project`:
- `src/components/exchange/SaleDialog.tsx` — create/edit sale dialog
- `src/components/exchange/SalesPage.tsx` — main sales page

## Files Created

### 1. `/home/z/my-project/src/components/exchange/SaleDialog.tsx`
- `'use client'` component, full TypeScript types.
- Props: `{ open, onOpenChange, editingSale?, onSuccess? }`.
- Form fields in RTL Arabic order: التاريخ, اسم الحساب (Select from `useAppStore().accounts`), اسم المادة (Select from `getMaterials()`), الكمية (Input number), الواحدة (Select from selected material's `materialUnits[]`), السعر الإفرادي (Input number with `$` suffix), البيان (Input text optional), السعر الإجمالي (read-only computed box).
- Live total = quantity × unitPrice via `useMemo`.
- Inventory check: on material selection, fetches `getMaterialInventory(materialId)`, shows info box "المتوفر: {currentInDefaultUnit} {defaultUnitName}". Computes `quantityInBase = quantity × selectedMaterialUnit.baseFactor` and compares to `inventory.currentInBase`. If exceeded: shows red warning "الكمية تتجاوز المخزون المتوفر" + disables save button.
- Material change: resets unitId to material's default unit and re-fetches inventory.
- On open: if `editingSale` prefills + preloads inventory; else resets to defaults (today's date, empty).
- On save: validates → `addSale`/`updateSale` → toast → dispatch `sales-updated` + `app-data-refreshed` events → `onSuccess` → close dialog.
- Save button: `Loader2` spinner while saving; disabled while loading materials or when inventory exceeded.
- Styling: shadcn Dialog, `rounded-xl`, emerald primary (`bg-emerald-500 hover:bg-emerald-600`), TrendingUp gradient icon `from-emerald-500 to-green-600`. All money in USD ($).

### 2. `/home/z/my-project/src/components/exchange/SalesPage.tsx`
- Matches `PurchasesPage` layout exactly.
- Sticky header: gradient icon (TrendingUp, `from-emerald-500 to-green-600`), title "المبيعات", count, admin-only "إضافة" button.
- Inventory summary card titled "المخزون الحالي" using `getAllMaterialInventories()` — horizontal chips per material showing `{currentInDefaultUnit} {defaultUnitName}` (emerald when positive, red when zero/negative).
- Search field (matches account name, material name, or description).
- Filters: account Select (from `useAppStore().accounts`), material Select (from `getMaterials()`), date-range (from/to with clear button).
- Monthly grouped list via `MonthCard` + `groupByMonth` (single month auto-expanded).
- Inline `SaleCard` sub-component: User icon + accountName (prominent) + "بيع" badge, material + date + quantity row, total in emerald with `$`, footer with unit price + "عرض كشف الحساب" link (BookOpen icon). Calls `openAccountStatement({ id, name } as Account)`.
- Inline `SaleDetailContent`: header with total, 2-column detail grid, optional description, "عرض كشف الحساب" outline button, admin-only Edit/Delete buttons.
- Delete confirmation via AlertDialog — calls `deleteSale(id)`, toasts result, dispatches refresh events.
- Empty state with TrendingUp icon + "لا توجد مبيعات" + admin-only add button when no filters applied.
- useEffect loads sales/materials/inventories on mount; listens for `sales-updated` and `app-data-refreshed` window events.
- Accepts optional `externalAddTrigger` prop.

## Validation
- `bun run lint` passed with **0 errors, 0 warnings** on the first try.
- Dev server log confirmed: `Next.js 16.1.6 (Turbopack)` ready on port 3000, no compilation errors.
- No existing files modified.
- All shadcn/ui components reused (Dialog, Select, Input, Label, Button, AlertDialog).
- Imports via `@/` alias; `cn` from `@/lib/utils`; `formatNumber`/`formatDate` from `@/lib/format`.
- RBAC enforced via `useAuth().isAdmin` for add/edit/delete.
