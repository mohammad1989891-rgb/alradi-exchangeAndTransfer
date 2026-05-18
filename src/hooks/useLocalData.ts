'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

// 🔸 ثوابت آلية إعادة المحاولة
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const INIT_TIMEOUT_MS = 15000;

// 🔸 دالة مساعدة لإعادة المحاولة
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY_MS): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`محاولة ${attempt}/${retries} فشلت، إعادة المحاولة بعد ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('فشلت جميع المحاولات');
}

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
  const [initError, setInitError] = useState<string | null>(null);

  // 🔸 منع التحديثات المتزامنة والمتكررة
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);
  const REFRESH_DEBOUNCE_MS = 300;

  // 🔸 تحميل البيانات مع حماية من التكرار
  const refreshData = useCallback(async (skipEvent = false) => {
    // 🔸 منع التحديث المتزامن
    if (isRefreshingRef.current) return;
    
    // 🔸 منع التحديث المتكرر السريع (debounce)
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < REFRESH_DEBOUNCE_MS) return;
    
    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;
    
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
      setInitError(null);
      
      // 🔸 إطلاق حدث تحديث البيانات فقط إذا لم يُطلب تجاهله
      // (لمنع الحلقة: useLocalData يطلق الحدث → page.tsx يستمع → يطلق refreshAllData → يطلق حدث آخر)
      if (!skipEvent) {
        window.dispatchEvent(new CustomEvent('local-data-refreshed'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setInitError('حدث خطأ في تحميل البيانات');
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // 🔸 التهيئة مع آلية إعادة المحاولة وتوقف زمني
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const init = async () => {
      try {
        setIsLoading(true);
        setInitError(null);
        
        // 🔸 إعادة المحاولة تلقائيًا عند فشل التهيئة
        await withRetry(async () => {
          if (cancelled) return;
          await initializeDatabase();
        });
        
        if (cancelled) return;
        
        await refreshData(true); // skipEvent=true لمنع إطلاق حدث أثناء التهيئة
        
        if (!cancelled) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing database after retries:', error);
        if (!cancelled) {
          setInitError('فشل في تهيئة قاعدة البيانات. يرجى إعادة تحميل الصفحة.');
          setIsInitialized(true); // السماح بالدخول لمنع الشاشة البيضاء
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // 🔸 توقف زمني للتهيئة (منع الانتظار اللانهائي)
    timeoutId = setTimeout(() => {
      if (!cancelled && !isInitialized) {
        console.warn('تهيئة قاعدة البيانات استغرقت وقتًا طويلاً');
        setIsInitialized(true);
        setIsLoading(false);
        setInitError('استغرقت التهيئة وقتًا طويلاً. قد لا تكون جميع البيانات محملة.');
      }
    }, INIT_TIMEOUT_MS);

    init();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [refreshData]);

  // ============================================
  // 🔸 الاستماع لأحداث تحديث البيانات
  // 🔸 تم إصلاح حلقة الأحداث: لا نعيد إطلاق الحدث هنا
  // ============================================
  useEffect(() => {
    let cancelled = false;

    const handleDataRefresh = async () => {
      if (cancelled || isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      
      try {
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

        if (!cancelled) {
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
        }
      } catch (error) {
        console.error('Error refreshing data from event:', error);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // 🔸 الاستماع لحدث تحديث البيانات من المكونات الأخرى
    // (وليس من useLocalData نفسه لمنع الحلقة)
    window.addEventListener('local-data-refreshed', handleDataRefresh);
    window.addEventListener('app-data-refreshed', handleDataRefresh);
    
    return () => {
      cancelled = true;
      window.removeEventListener('local-data-refreshed', handleDataRefresh);
      window.removeEventListener('app-data-refreshed', handleDataRefresh);
    };
  }, []);

  // ============================================
  // حساب إجمالي الأرصدة بشكل ديناميكي
  // ============================================
  const calculateTotalBalanceFromVaults = useCallback(() => {
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
  }, [vaults, currencies]);

  const actualTotalBalance = calculateTotalBalanceFromVaults();

  // 🔸 دالة إعادة المحاولة اليدوية
  const retryInit = useCallback(async () => {
    setIsLoading(true);
    setInitError(null);
    try {
      await initializeDatabase();
      await refreshData(true);
      setIsInitialized(true);
    } catch (error) {
      console.error('Retry init failed:', error);
      setInitError('فشلت إعادة المحاولة. يرجى تحديث الصفحة.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

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
    totalBalanceUSD: actualTotalBalance,
    debtRemaining,
    isLoading,
    isInitialized,
    initError,
    
    // Actions
    refreshData,
    retryInit,
    setCurrencies,
    setVaults,
    setAccounts,
    setTransactions,
    setDebts,
    setDebtPayments,
    setCurrencyExchanges,
    
    // Currency actions (مع try/catch)
    activateCurrency: async (currencyId: string, exchangeRate?: number) => {
      try {
        const result = await activateCurrency(currencyId, exchangeRate);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error activating currency:', error);
        throw error;
      }
    },
    deactivateCurrency: async (currencyId: string) => {
      try {
        await deactivateCurrency(currencyId);
        await refreshData();
      } catch (error) {
        console.error('Error deactivating currency:', error);
        throw error;
      }
    },
    updateCurrencyExchangeRate: async (currencyId: string, rate: number) => {
      try {
        const result = await updateCurrencyExchangeRate(currencyId, rate);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating exchange rate:', error);
        throw error;
      }
    },
    updateCurrencyConversionMethod: async (currencyId: string, method: 'MULTIPLY' | 'DIVIDE') => {
      try {
        const result = await updateCurrencyConversionMethod(currencyId, method);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating conversion method:', error);
        throw error;
      }
    },
    
    // Vault actions (مع try/catch)
    updateVaultOpeningBalance: async (currencyId: string, balance: number) => {
      try {
        const result = await updateVaultOpeningBalance(currencyId, balance);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating vault balance:', error);
        throw error;
      }
    },
    
    // Account actions (مع try/catch)
    addAccount: async (data: Partial<Account>) => {
      try {
        const result = await addAccount(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding account:', error);
        throw error;
      }
    },
    updateAccount: async (id: string, data: Partial<Account>) => {
      try {
        const result = await updateAccount(id, data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating account:', error);
        throw error;
      }
    },
    deleteAccount: async (id: string) => {
      try {
        await deleteAccount(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting account:', error);
        throw error;
      }
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
    
    // Debt actions (مع try/catch)
    addDebt: async (data: Parameters<typeof addDebt>[0]) => {
      try {
        const result = await addDebt(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding debt:', error);
        throw error;
      }
    },
    updateDebt: async (id: string, data: Partial<Debt>) => {
      try {
        const result = await updateDebt(id, data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating debt:', error);
        throw error;
      }
    },
    deleteDebt: async (id: string) => {
      try {
        await deleteDebt(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting debt:', error);
        throw error;
      }
    },
    
    // Debt Payment actions (مع try/catch)
    addDebtPayment: async (data: Parameters<typeof addDebtPayment>[0]) => {
      try {
        const result = await addDebtPayment(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding debt payment:', error);
        throw error;
      }
    },
    deleteDebtPayment: async (id: string) => {
      try {
        await deleteDebtPayment(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting debt payment:', error);
        throw error;
      }
    },
    
    // Currency Exchange actions (مع try/catch)
    addCurrencyExchange: async (data: Parameters<typeof addCurrencyExchange>[0]) => {
      try {
        const result = await addCurrencyExchange(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding exchange:', error);
        throw error;
      }
    },
    deleteCurrencyExchange: async (id: string) => {
      try {
        await deleteCurrencyExchange(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting exchange:', error);
        throw error;
      }
    },
  };
}
