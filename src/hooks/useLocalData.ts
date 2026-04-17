'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  initializeDatabase,
  getAllAvailableCurrencies,
  getActiveCurrencies,
  getVaults,
  getAccounts,
  getTransactions,
  getDebts,
  getTotalBalanceInUSD,
  activateCurrency,
  deactivateCurrency,
  updateCurrencyExchangeRate,
  updateCurrencyConversionMethod,
  updateVaultOpeningBalance,
  addAccount,
  updateAccount,
  deleteAccount,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addDebt,
  updateDebt,
  deleteDebt,
  getDebtPayments,
  addDebtPayment,
  deleteDebtPayment,
  getTotalDebtRemaining,
  getCurrencyExchanges,
  addCurrencyExchange,
  deleteCurrencyExchange,
  getExchangeStats,
  getAccountDebtSummary,
  getAllAccountsDebtSummary,
} from '@/lib/localDb';
import type { Currency, Vault, Account, Transaction, Debt, DebtPayment, CurrencyExchange, AccountDebtSummary } from '@/lib/localDb';

export function useLocalData() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [currencyExchanges, setCurrencyExchanges] = useState<CurrencyExchange[]>([]);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);
  const [debtRemaining, setDebtRemaining] = useState<{
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
    // الديون الآجلة
    deferredReceivable: number;
    deferredPayable: number;
    deferredReceivablePaid: number;
    deferredPayablePaid: number;
    deferredReceivableRemaining: number;
    deferredPayableRemaining: number;
    // الديون النقدية
    cashReceivable: number;
    cashPayable: number;
    cashReceivablePaid: number;
    cashPayablePaid: number;
    cashReceivableRemaining: number;
    cashPayableRemaining: number;
  }>({
    totalDebts: 0,
    totalPaid: 0,
    totalRemaining: 0,
    unpaidDebtsCount: 0,
    paidDebtsCount: 0,
    totalReceivable: 0,
    totalPayable: 0,
    totalReceivablePaid: 0,
    totalPayablePaid: 0,
    totalReceivableRemaining: 0,
    totalPayableRemaining: 0,
    // الديون الآجلة
    deferredReceivable: 0,
    deferredPayable: 0,
    deferredReceivablePaid: 0,
    deferredPayablePaid: 0,
    deferredReceivableRemaining: 0,
    deferredPayableRemaining: 0,
    // الديون النقدية
    cashReceivable: 0,
    cashPayable: 0,
    cashReceivablePaid: 0,
    cashPayablePaid: 0,
    cashReceivableRemaining: 0,
    cashPayableRemaining: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load all data
  const refreshData = useCallback(async () => {
    try {
      const [allCur, activeCur, vaultsData, accountsData, txData, debtData, debtPaymentsData, totalUSD, debtRemainingData, exchangeData, exchangeStatsData] = await Promise.all([
        getAllAvailableCurrencies(),
        getActiveCurrencies(),
        getVaults(),
        getAccounts(),
        getTransactions(),
        getDebts(),
        getDebtPayments(),
        getTotalBalanceInUSD(),
        getTotalDebtRemaining(),
        getCurrencyExchanges(),
        getExchangeStats(),
      ]);

      setAllCurrencies(allCur);
      setCurrencies(activeCur);
      setVaults(vaultsData);
      setAccounts(accountsData);
      setTransactions(txData);
      setDebts(debtData);
      setDebtPayments(debtPaymentsData);
      setTotalBalanceUSD(totalUSD);
      setDebtRemaining(debtRemainingData);
      setCurrencyExchanges(exchangeData);
      
      // إطلاق حدث تحديث البيانات لإعلام المكونات الأخرى
      window.dispatchEvent(new CustomEvent('local-data-refreshed'));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await initializeDatabase();
        await refreshData();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing database:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loading
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshData]);

  // ============================================
  // الاستماع لأحداث تحديث البيانات
  // ============================================
  // عند أي تغيير في البيانات من أي مكون آخر، يتم تحديث البيانات هنا
  useEffect(() => {
    const handleDataRefresh = async () => {
      try {
        // إعادة تحميل البيانات من قاعدة البيانات
        const [allCur, activeCur, vaultsData, accountsData, txData, debtData, debtPaymentsData, totalUSD, debtRemainingData, exchangeData] = await Promise.all([
          getAllAvailableCurrencies(),
          getActiveCurrencies(),
          getVaults(),
          getAccounts(),
          getTransactions(),
          getDebts(),
          getDebtPayments(),
          getTotalBalanceInUSD(),
          getTotalDebtRemaining(),
          getCurrencyExchanges(),
        ]);

        setAllCurrencies(allCur);
        setCurrencies(activeCur);
        setVaults(vaultsData);
        setAccounts(accountsData);
        setTransactions(txData);
        setDebts(debtData);
        setDebtPayments(debtPaymentsData);
        setTotalBalanceUSD(totalUSD);
        setDebtRemaining(debtRemainingData);
        setCurrencyExchanges(exchangeData);
      } catch (error) {
        console.error('Error refreshing data from event:', error);
      }
    };

    // الاستماع لحدث تحديث البيانات
    window.addEventListener('local-data-refreshed', handleDataRefresh);
    
    return () => {
      window.removeEventListener('local-data-refreshed', handleDataRefresh);
    };
  }, []);

  // ============================================
  // حساب إجمالي الأرصدة بشكل ديناميكي
  // ============================================
  // يتم حساب الإجمالي مباشرة من الصناديق وليس من قيمة مخزنة
  const calculateTotalBalanceFromVaults = useCallback(() => {
    let total = 0;
    for (const vault of vaults) {
      const currency = currencies.find(c => c.id === vault.currencyId);
      if (currency && currency.isActive) {
        // تطبيق طريقة التحويل المناسبة
        if (currency.conversionMethod === 'DIVIDE') {
          total += vault.balance / currency.exchangeRate;
        } else {
          total += vault.balance * currency.exchangeRate;
        }
      }
    }
    return total;
  }, [vaults, currencies]);

  // القيمة الفعلية للإجمالي (محسوبة من الصناديق)
  const actualTotalBalance = calculateTotalBalanceFromVaults();

  return {
    // Data
    currencies,
    allCurrencies,
    vaults,
    accounts,
    transactions,
    debts,
    debtPayments,
    currencyExchanges,
    totalBalanceUSD: actualTotalBalance, // استخدام القيمة المحسوبة ديناميكياً
    debtRemaining,
    isLoading,
    isInitialized,
    
    // Actions
    refreshData,
    setCurrencies,
    setVaults,
    setAccounts,
    setTransactions,
    setDebts,
    setDebtPayments,
    setCurrencyExchanges,
    
    // Currency actions
    activateCurrency: async (currencyId: string, exchangeRate?: number) => {
      const result = await activateCurrency(currencyId, exchangeRate);
      await refreshData();
      return result;
    },
    deactivateCurrency: async (currencyId: string) => {
      await deactivateCurrency(currencyId);
      await refreshData();
    },
    updateCurrencyExchangeRate: async (currencyId: string, rate: number) => {
      const result = await updateCurrencyExchangeRate(currencyId, rate);
      await refreshData();
      return result;
    },
    updateCurrencyConversionMethod: async (currencyId: string, method: 'MULTIPLY' | 'DIVIDE') => {
      const result = await updateCurrencyConversionMethod(currencyId, method);
      await refreshData();
      return result;
    },
    
    // Vault actions
    updateVaultOpeningBalance: async (currencyId: string, balance: number) => {
      const result = await updateVaultOpeningBalance(currencyId, balance);
      await refreshData();
      return result;
    },
    
    // Account actions
    addAccount: async (data: Partial<Account>) => {
      const result = await addAccount(data);
      await refreshData();
      return result;
    },
    updateAccount: async (id: string, data: Partial<Account>) => {
      const result = await updateAccount(id, data);
      await refreshData();
      return result;
    },
    deleteAccount: async (id: string) => {
      await deleteAccount(id);
      await refreshData();
    },
    
    // Transaction actions
    addTransaction: async (data: Parameters<typeof addTransaction>[0]) => {
      try {
        const result = await addTransaction(data);
        await refreshData();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    updateTransaction: async (id: string, data: Partial<Transaction>) => {
      try {
        const result = await updateTransaction(id, data);
        await refreshData();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    deleteTransaction: async (id: string) => {
      try {
        await deleteTransaction(id);
        await refreshData();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    
    // Debt actions
    addDebt: async (data: Parameters<typeof addDebt>[0]) => {
      const result = await addDebt(data);
      await refreshData();
      return result;
    },
    updateDebt: async (id: string, data: Partial<Debt>) => {
      const result = await updateDebt(id, data);
      await refreshData();
      return result;
    },
    deleteDebt: async (id: string) => {
      await deleteDebt(id);
      await refreshData();
    },
    
    // Debt Payment actions
    addDebtPayment: async (data: Parameters<typeof addDebtPayment>[0]) => {
      const result = await addDebtPayment(data);
      await refreshData();
      return result;
    },
    deleteDebtPayment: async (id: string) => {
      await deleteDebtPayment(id);
      await refreshData();
    },
    
    // Currency Exchange actions
    addCurrencyExchange: async (data: Parameters<typeof addCurrencyExchange>[0]) => {
      const result = await addCurrencyExchange(data);
      await refreshData();
      return result;
    },
    deleteCurrencyExchange: async (id: string) => {
      await deleteCurrencyExchange(id);
      await refreshData();
    },
  };
}
