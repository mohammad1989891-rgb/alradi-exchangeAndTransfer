/**
 * Cached Calculations — Memoized computation utilities for performance.
 *
 * Provides stable, efficient calculation functions that avoid
 * unnecessary recomputation when the underlying data hasn't changed.
 */

import type { Transaction, Debt, DebtPayment, CurrencyExchange, Vault, Currency } from '@/lib/supabaseDb';

// ============================================
// Simple hash function for cache keys
// ============================================
function simpleHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// ============================================
// Cache store with TTL
// ============================================
interface CacheEntry<T> {
  value: T;
  hash: string;
  timestamp: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

function createCachedCalculator<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  getCacheKey: (...args: TArgs) => string,
) {
  let cache: CacheEntry<TResult> | null = null;

  return (...args: TArgs): TResult => {
    const key = getCacheKey(...args);
    const now = Date.now();

    if (cache && cache.hash === key && (now - cache.timestamp) < CACHE_TTL_MS) {
      return cache.value;
    }

    const value = fn(...args);
    cache = { value, hash: key, timestamp: now };
    return value;
  };
}

// ============================================
// Total Balance Calculation (cached)
// ============================================
export const calcTotalBalanceUSD = createCachedCalculator(
  (vaults: Vault[], currencies: Currency[]) => {
    let total = 0;
    for (const vault of vaults) {
      const currency = currencies.find(c => c.id === vault.currencyId);
      if (currency && currency.isActive) {
        if (currency.conversionMethod === 'DIVIDE') {
          total += vault.balance / currency.exchangeRate;
        } else {
          total += vault.balance * currency.exchangeRate;
        }
      }
    }
    return total;
  },
  (vaults, currencies) => simpleHash({
    v: vaults.map(v => `${v.currencyId}:${v.balance}`).join(','),
    c: currencies.filter(c => c.isActive).map(c => `${c.id}:${c.exchangeRate}:${c.conversionMethod}`).join(','),
  }),
);

// ============================================
// Debt Remaining Calculation (cached)
// ============================================
interface DebtRemainingResult {
  totalDebts: number;
  totalPaid: number;
  totalRemaining: number;
  unpaidDebtsCount: number;
  paidDebtsCount: number;
  totalReceivable: number;
  totalPayable: number;
  totalReceivablePaid: number;
  totalPayablePaid: number;
  totalReceivableRemaining: number;
  totalPayableRemaining: number;
  deferredReceivable: number;
  deferredPayable: number;
  deferredReceivablePaid: number;
  deferredPayablePaid: number;
  deferredReceivableRemaining: number;
  deferredPayableRemaining: number;
  cashReceivable: number;
  cashPayable: number;
  cashReceivablePaid: number;
  cashPayablePaid: number;
  cashReceivableRemaining: number;
  cashPayableRemaining: number;
}

export const EMPTY_DEBT_REMAINING: DebtRemainingResult = {
  totalDebts: 0, totalPaid: 0, totalRemaining: 0,
  unpaidDebtsCount: 0, paidDebtsCount: 0,
  totalReceivable: 0, totalPayable: 0,
  totalReceivablePaid: 0, totalPayablePaid: 0,
  totalReceivableRemaining: 0, totalPayableRemaining: 0,
  deferredReceivable: 0, deferredPayable: 0,
  deferredReceivablePaid: 0, deferredPayablePaid: 0,
  deferredReceivableRemaining: 0, deferredPayableRemaining: 0,
  cashReceivable: 0, cashPayable: 0,
  cashReceivablePaid: 0, cashPayablePaid: 0,
  cashReceivableRemaining: 0, cashPayableRemaining: 0,
};

export const calcDebtRemaining = createCachedCalculator(
  (debts: Debt[], debtPayments: DebtPayment[]): DebtRemainingResult => {
    const receivableDebts = debts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
    const payableDebts = debts.filter(d => d.debtType === 'PAYABLE');

    const deferredReceivableDebts = receivableDebts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);
    const deferredPayableDebts = payableDebts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);
    const cashReceivableDebts = receivableDebts.filter(d => d.debtMode === 'CASH');
    const cashPayableDebts = payableDebts.filter(d => d.debtMode === 'CASH');

    const totalReceivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    const totalPayable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    const totalDebts = debts.reduce((sum, d) => sum + d.finalBalance, 0);

    const deferredReceivable = deferredReceivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    const deferredPayable = deferredPayableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    const cashReceivable = cashReceivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    const cashPayable = cashPayableDebts.reduce((sum, d) => sum + d.finalBalance, 0);

    const paymentsByDebt = new Map<string, number>();
    for (const payment of debtPayments) {
      const current = paymentsByDebt.get(payment.debtId) || 0;
      paymentsByDebt.set(payment.debtId, current + payment.amount);
    }

    const totalPaid = debtPayments.reduce((sum, p) => sum + p.amount, 0);

    let totalReceivablePaid = 0;
    let totalPayablePaid = 0;
    for (const debt of receivableDebts) {
      totalReceivablePaid += paymentsByDebt.get(debt.id) || 0;
    }
    for (const debt of payableDebts) {
      totalPayablePaid += paymentsByDebt.get(debt.id) || 0;
    }

    let deferredReceivablePaid = 0;
    let deferredPayablePaid = 0;
    for (const debt of deferredReceivableDebts) {
      deferredReceivablePaid += paymentsByDebt.get(debt.id) || 0;
    }
    for (const debt of deferredPayableDebts) {
      deferredPayablePaid += paymentsByDebt.get(debt.id) || 0;
    }

    let cashReceivablePaid = 0;
    let cashPayablePaid = 0;
    for (const debt of cashReceivableDebts) {
      cashReceivablePaid += paymentsByDebt.get(debt.id) || 0;
    }
    for (const debt of cashPayableDebts) {
      cashPayablePaid += paymentsByDebt.get(debt.id) || 0;
    }

    const totalReceivableRemaining = totalReceivable - totalReceivablePaid;
    const totalPayableRemaining = totalPayable - totalPayablePaid;
    const totalRemaining = totalDebts - totalPaid;

    const unpaidDebtsCount = debts.filter(d => {
      const paid = paymentsByDebt.get(d.id) || 0;
      return paid < d.finalBalance;
    }).length;
    const paidDebtsCount = debts.length - unpaidDebtsCount;

    return {
      totalDebts,
      totalPaid,
      totalRemaining,
      unpaidDebtsCount,
      paidDebtsCount,
      totalReceivable,
      totalPayable,
      totalReceivablePaid,
      totalPayablePaid,
      totalReceivableRemaining,
      totalPayableRemaining,
      deferredReceivable,
      deferredPayable,
      deferredReceivablePaid,
      deferredPayablePaid,
      deferredReceivableRemaining: deferredReceivable - deferredReceivablePaid,
      deferredPayableRemaining: deferredPayable - deferredPayablePaid,
      cashReceivable,
      cashPayable,
      cashReceivablePaid,
      cashPayablePaid,
      cashReceivableRemaining: cashReceivable - cashReceivablePaid,
      cashPayableRemaining: cashPayable - cashPayablePaid,
    };
  },
  (debts, debtPayments) => simpleHash({
    d: debts.length,
    p: debtPayments.length,
    dh: debts.slice(0, 5).map(d => `${d.id}:${d.finalBalance}`).join(','),
    ph: debtPayments.slice(0, 5).map(p => `${p.debtId}:${p.amount}`).join(','),
  }),
);

// ============================================
// Account Balance Calculation (cached)
// ============================================
export const calcAccountBalance = createCachedCalculator(
  (accountId: string, transactions: Transaction[]): { totalIncome: number; totalExpense: number; netBalance: number } => {
    const accountTx = transactions.filter(t => t.accountId === accountId && t.isComplete !== false);
    const totalIncome = accountTx
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.finalBalance || 0), 0);
    const totalExpense = accountTx
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.finalBalance || 0), 0);
    return { totalIncome, totalExpense, netBalance: totalIncome - totalExpense };
  },
  (accountId, transactions) => simpleHash({
    a: accountId,
    n: transactions.filter(t => t.accountId === accountId).length,
  }),
);

// ============================================
// Monthly Operation Count (cached)
// ============================================
export interface MonthOperationCount {
  key: string; // e.g., "2026-01"
  year: number;
  month: number;
  label: string; // e.g., "يناير 2026"
  count: number; // total operations in this month
}

export const calcMonthlyOperationCounts = createCachedCalculator(
  (items: { date: string | Date }[]): MonthOperationCount[] => {
    const ARABIC_MONTHS = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ] as const;

    const map = new Map<string, { year: number; month: number; count: number }>();

    for (const item of items) {
      const date = item.date instanceof Date ? item.date : new Date(item.date);
      if (isNaN(date.getTime())) continue;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { year, month, count: 1 });
      }
    }

    return Array.from(map.entries())
      .map(([key, { year, month, count }]) => ({
        key,
        year,
        month,
        label: `${ARABIC_MONTHS[month - 1]} ${year}`,
        count,
      }))
      .sort((a, b) => b.year - a.year || b.month - a.month);
  },
  (items) => simpleHash({ n: items.length, first: items[0] ? String(items[0].date) : '' }),
);
