'use client';

/**
 * useAccountStatement — Single Source of Truth for account balance calculations.
 *
 * This hook centralizes the EXACT same accounting logic used by the account
 * statement (دفتر الأستاذ / AccountStatementModal) so that ANY other screen
 * that needs an account's final balance (e.g. AccountMatchModal / مطابقة
 * الحساب) can reuse it instead of re-implementing its own logic.
 *
 * Per spec (مطابقة الحسابات):
 *   - الحركات المالية (transactions)  → تؤثر على الرصيد
 *   - الديون (debts)                  → تؤثر على الرصيد (مطروح منها الدفعات)
 *   - فواتير البيع الآجلة              → تؤثر على الرصيد (لنا)
 *   - فواتير البيع النقدية            → لا تؤثر (تم تحصيلها في الصندوق)
 *   - فواتير الشراء                    → لا توجد حالياً في النظام كـ "آجلة"
 *                                       (كل المشتريات كاش وتخصم من الصندوق
 *                                        فوراً، لذا فهي مرجعية فقط مثل البيع الكاشي)
 *
 * IMPORTANT: Do NOT add new accounting logic here. This hook is a faithful
 * extraction of AccountStatementModal's `currencyStats` + `debtStats`
 * useMemos. If the statement's logic changes, update it there and mirror
 * the change here (or, better, refactor the statement to use this hook).
 */

import { useState, useEffect, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { getSalesByAccount } from '@/lib/supabaseDb';
import type { Sale, Transaction, Debt, DebtPayment, Currency } from '@/lib/supabaseDb';

// Unified statement item type: a transaction OR a sale, with runningBalance.
// Mirrors the local type defined inline in AccountStatementModal so the
// accounting semantics are byte-for-byte identical.
export type StatementItem = {
  id: string;
  date: Date;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  finalBalance: number;
  description?: string | null;
  runningBalance: number;
  isSale: boolean;
  paymentMethod?: 'cash' | 'credit';
  materialName?: string;
  quantity?: number;
  unitName?: string;
};

export type CurrencyStat = {
  currency: Currency | undefined;
  totalIncome: number; // مجموع (لنا) — credit sales + income transactions
  totalExpense: number; // مجموع (علينا) — expense transactions
  netBalance: number; // الرصيد النهائي
  items: StatementItem[];
};

export type DebtStat = {
  currency: Currency | undefined;
  totalDebt: number;
  paidDebt: number;
  unpaidDebt: number;
  debts: Debt[];
  paymentsByDebt: Record<string, DebtPayment[]>;
  remainingByDebt: Record<string, number>;
};

export type AccountStatementResult = {
  /** Per-currency statement stats (transactions + credit sales). Key = currencyId. */
  currencyStats: Record<string, CurrencyStat>;
  /** Per-currency debt stats. Key = currencyId. */
  debtStats: Record<string, DebtStat>;
  /** Convenience: USD net balance (the receivable amount "لنا" if positive). */
  usdNetBalance: number;
  /** Convenience: whether the account has any data at all. */
  hasData: boolean;
  /** Whether sales are currently being fetched. */
  isLoadingSales: boolean;
};

/**
 * Compute the statement for a single account.
 *
 * @param accountId     The account to compute the statement for.
 * @param dateFrom      Optional ISO date filter (inclusive).
 * @param dateTo        Optional ISO date filter (inclusive).
 * @param listenToLive  When true (default), refetches sales on `sales-updated`
 *                      and `app-data-refreshed` window events so the statement
 *                      stays live-synced with the latest data.
 */
export function useAccountStatement(
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
  listenToLive = true,
): AccountStatementResult {
  const { transactions, debts, debtPayments, currencies } = useSupabaseData();

  // 🔸 Sales linked to the selected account (all in USD per spec).
  //    Fetched via getSalesByAccount (selects ALL sales — no payment_method
  //    filter — so both cash and credit sales are returned). Cash sales stay
  //    visible in the items list as reference rows but are EXCLUDED from the
  //    balance (they were already collected into the USD vault).
  const [accountSales, setAccountSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  const hasDateFilter = !!(dateFrom || dateTo);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    const load = () => {
      setIsLoadingSales(true);
      getSalesByAccount(accountId)
        .then((sales) => {
          if (!cancelled) setAccountSales(sales);
        })
        .catch((err) => {
          console.error('Error fetching sales for account:', err);
          if (!cancelled) setAccountSales([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingSales(false);
        });
    };

    load();

    if (listenToLive) {
      const handle = () => load();
      window.addEventListener('sales-updated', handle);
      window.addEventListener('app-data-refreshed', handle);
      return () => {
        cancelled = true;
        window.removeEventListener('sales-updated', handle);
        window.removeEventListener('app-data-refreshed', handle);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [accountId, listenToLive]);

  // Filter transactions for this account (with optional date filter)
  const accountTransactions = useMemo<Transaction[]>(() => {
    if (!accountId) return [];
    let filtered = transactions.filter(
      (t) => t.accountId === accountId && t.isComplete !== false,
    );
    if (hasDateFilter) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.date).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || txDate >= dateFrom;
        const matchesDateTo = !dateTo || txDate <= dateTo;
        return matchesDateFrom && matchesDateTo;
      });
    }
    return filtered;
  }, [transactions, accountId, dateFrom, dateTo, hasDateFilter]);

  // Account-scoped debts (no date filter on debts per the statement's behavior)
  const accountDebts = useMemo<Debt[]>(() => {
    if (!accountId) return [];
    return debts.filter((d) => d.accountId === accountId);
  }, [debts, accountId]);

  // Group transactions by currency
  const transactionsByCurrency = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    for (const tx of accountTransactions) {
      const currencyId = tx.currencyId;
      if (!grouped[currencyId]) grouped[currencyId] = [];
      grouped[currencyId].push(tx);
    }
    for (const currencyId in grouped) {
      grouped[currencyId].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }
    return grouped;
  }, [accountTransactions]);

  // Date-filtered sales for this account (all sales are USD per spec)
  const filteredAccountSales = useMemo<Sale[]>(() => {
    if (!hasDateFilter) return accountSales;
    return accountSales.filter((s) => {
      const sDate = new Date(s.date).toISOString().split('T')[0];
      const matchesDateFrom = !dateFrom || sDate >= dateFrom;
      const matchesDateTo = !dateTo || sDate <= dateTo;
      return matchesDateFrom && matchesDateTo;
    });
  }, [accountSales, dateFrom, dateTo, hasDateFilter]);

  // ============================================================
  // currencyStats — IDENTICAL to AccountStatementModal's logic.
  // Transactions + (credit sales only as INCOME). Cash sales appear
  // as reference rows but do NOT move the balance.
  // ============================================================
  const currencyStats = useMemo<Record<string, CurrencyStat>>(() => {
    const stats: Record<string, CurrencyStat> = {};
    const usdCurrency = currencies.find((c) => c.code === 'USD');

    for (const currencyId in transactionsByCurrency) {
      const currency = currencies.find((c) => c.id === currencyId);
      const txs = transactionsByCurrency[currencyId];

      let items: StatementItem[] = txs.map((tx) => ({
        id: tx.id,
        date: new Date(tx.date),
        type: tx.type,
        amount: tx.amount,
        finalBalance: tx.finalBalance,
        description: tx.description,
        runningBalance: 0,
        isSale: false,
      }));

      // Merge sales (as INCOME) into the USD currency section
      if (usdCurrency && currencyId === usdCurrency.id && filteredAccountSales.length > 0) {
        const saleItems: StatementItem[] = filteredAccountSales.map((s) => ({
          id: s.id,
          date: new Date(s.date),
          type: 'INCOME' as const,
          amount: s.totalPrice,
          finalBalance: s.totalPrice,
          description: s.description || `بيع ${s.materialName}`,
          runningBalance: 0,
          isSale: true,
          paymentMethod: s.paymentMethod,
          materialName: s.materialName,
          quantity: s.quantity,
          unitName: s.unitName,
        }));
        items = items.concat(saleItems);
      }

      // Sort by date ascending (id as stable tiebreaker)
      items.sort((a, b) => {
        const diff = a.date.getTime() - b.date.getTime();
        if (diff !== 0) return diff;
        return a.id.localeCompare(b.id);
      });

      // Compute running balance — cash sales are reference-only
      let totalIncome = 0;
      let totalExpense = 0;
      let runningBalance = 0;
      items = items.map((it) => {
        const isCashSale = it.isSale && it.paymentMethod === 'cash';
        if (!isCashSale) {
          if (it.type === 'INCOME') {
            totalIncome += it.finalBalance;
            runningBalance += it.finalBalance;
          } else {
            totalExpense += it.finalBalance;
            runningBalance -= it.finalBalance;
          }
        }
        return { ...it, runningBalance };
      });

      stats[currencyId] = {
        currency,
        totalIncome,
        totalExpense,
        netBalance: runningBalance,
        items,
      };
    }

    // Edge case: account has sales but NO USD transactions — still show USD section
    if (usdCurrency && !stats[usdCurrency.id] && filteredAccountSales.length > 0) {
      let items: StatementItem[] = filteredAccountSales.map((s) => ({
        id: s.id,
        date: new Date(s.date),
        type: 'INCOME' as const,
        amount: s.totalPrice,
        finalBalance: s.totalPrice,
        description: s.description || `بيع ${s.materialName}`,
        runningBalance: 0,
        isSale: true,
        paymentMethod: s.paymentMethod,
        materialName: s.materialName,
        quantity: s.quantity,
        unitName: s.unitName,
      }));
      items.sort((a, b) => a.date.getTime() - b.date.getTime());
      let totalIncome = 0;
      let runningBalance = 0;
      items = items.map((it) => {
        const isCashSale = it.isSale && it.paymentMethod === 'cash';
        if (!isCashSale) {
          totalIncome += it.finalBalance;
          runningBalance += it.finalBalance;
        }
        return { ...it, runningBalance };
      });
      stats[usdCurrency.id] = {
        currency: usdCurrency,
        totalIncome,
        totalExpense: 0,
        netBalance: runningBalance,
        items,
      };
    }

    return stats;
  }, [transactionsByCurrency, currencies, filteredAccountSales]);

  // ============================================================
  // debtStats — IDENTICAL to AccountStatementModal's logic.
  // ============================================================
  const debtsByCurrency = useMemo(() => {
    const grouped: Record<string, Debt[]> = {};
    for (const debt of accountDebts) {
      const currencyId = debt.currencyId;
      if (!grouped[currencyId]) grouped[currencyId] = [];
      grouped[currencyId].push(debt);
    }
    for (const currencyId in grouped) {
      grouped[currencyId].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }
    return grouped;
  }, [accountDebts]);

  const debtStats = useMemo<Record<string, DebtStat>>(() => {
    const stats: Record<string, DebtStat> = {};

    for (const currencyId in debtsByCurrency) {
      const currency = currencies.find((c) => c.id === currencyId);
      const currencyDebts = debtsByCurrency[currencyId];

      const paymentsByDebt: Record<string, DebtPayment[]> = {};
      const remainingByDebt: Record<string, number> = {};

      let totalDebt = 0;
      let totalPaid = 0;

      for (const debt of currencyDebts) {
        const debtPaymentsList = debtPayments.filter((p) => p.debtId === debt.id);
        paymentsByDebt[debt.id] = debtPaymentsList;

        const paidAmount = debtPaymentsList.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, debt.finalBalance - paidAmount);

        remainingByDebt[debt.id] = remaining;
        totalDebt += debt.finalBalance;
        totalPaid += paidAmount;
      }

      stats[currencyId] = {
        currency,
        totalDebt,
        paidDebt: totalPaid,
        unpaidDebt: totalDebt - totalPaid,
        debts: currencyDebts,
        paymentsByDebt,
        remainingByDebt,
      };
    }

    return stats;
  }, [debtsByCurrency, currencies, debtPayments]);

  // Convenience: USD net balance (the main "لنا" / "لكم" figure)
  const usdNetBalance = useMemo(() => {
    const usdCurrency = currencies.find((c) => c.code === 'USD');
    if (!usdCurrency) return 0;
    return currencyStats[usdCurrency.id]?.netBalance ?? 0;
  }, [currencyStats, currencies]);

  const hasData =
    Object.keys(currencyStats).length > 0 || Object.keys(debtStats).length > 0;

  return {
    currencyStats,
    debtStats,
    usdNetBalance,
    hasData,
    isLoadingSales,
  };
}
