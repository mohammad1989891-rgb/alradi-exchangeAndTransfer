'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  initializeDatabase,
  resetInitializationState,
  checkTablesExist,
  tablesExist as tablesExistFlag,
  TABLES_MISSING_ERROR,
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
} from '@/lib/supabaseDb';
import type { Currency, Vault, Account, Transaction, Debt, DebtPayment, CurrencyExchange } from '@/lib/supabaseDb';

// ============================================
// Retry Constants
// ============================================
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const INIT_TIMEOUT_MS = 15000;
const FALLBACK_POLL_INTERVAL_MS = 10000; // 10s — fast enough for cross-device sync
const REFRESH_DEBOUNCE_MS = 300;

// ============================================
// Debt Remaining Type (matches useLocalData exactly)
// ============================================
interface DebtRemaining {
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

const EMPTY_DEBT_REMAINING: DebtRemaining = {
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
  deferredReceivable: 0,
  deferredPayable: 0,
  deferredReceivablePaid: 0,
  deferredPayablePaid: 0,
  deferredReceivableRemaining: 0,
  deferredPayableRemaining: 0,
  cashReceivable: 0,
  cashPayable: 0,
  cashReceivablePaid: 0,
  cashPayablePaid: 0,
  cashReceivableRemaining: 0,
  cashPayableRemaining: 0,
};

// ============================================
// Helper: Retry with exponential backoff
// ============================================
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY_MS): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Attempt ${attempt}/${retries} failed, retrying after ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('All retry attempts failed');
}

// ============================================
// Table names for Realtime subscriptions
// ============================================
const REALTIME_TABLES = [
  'currencies',
  'vaults',
  'accounts',
  'transactions',
  'debts',
  'debt_payments',
  'currency_exchanges',
] as const;

// ============================================
// The Hook
// ============================================
export function useSupabaseData() {
  // ---- State ----
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [currencyExchanges, setCurrencyExchanges] = useState<CurrencyExchange[]>([]);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);
  const [debtRemaining, setDebtRemaining] = useState<DebtRemaining>(EMPTY_DEBT_REMAINING);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [tablesMissing, setTablesMissing] = useState(false);

  // ---- Refs ----
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeConnectedRef = useRef(false);
  const mountedRef = useRef(true);
  const tablesExistRef = useRef(true); // Track whether Supabase tables exist

  // ============================================
  // Refresh: load all data from Supabase
  // ============================================
  const refreshData = useCallback(async (skipEvent = false, forceRefresh = false) => {
    // If a refresh is in progress and this is not forced, skip
    if (isRefreshingRef.current && !forceRefresh) return;

    // If a refresh is in progress and this is forced, wait for it to finish
    if (isRefreshingRef.current && forceRefresh) {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (!isRefreshingRef.current) break;
      }
      if (isRefreshingRef.current) return; // timeout, skip
    }

    // Debounce: prevent rapid consecutive refreshes (unless forced)
    if (!forceRefresh) {
      const debounceNow = Date.now();
      if (debounceNow - lastRefreshTimeRef.current < REFRESH_DEBOUNCE_MS) return;
    }

    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = Date.now();

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

      if (!mountedRef.current) return;

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

      // Dispatch event for other components (same as useLocalData)
      if (!skipEvent) {
        window.dispatchEvent(new CustomEvent('local-data-refreshed'));
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      setInitError('حدث خطأ في تحميل البيانات');
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // ============================================
  // Targeted refresh: refresh only specific tables
  // ============================================
  const refreshCurrencies = useCallback(async () => {
    try {
      const [allCur, activeCur] = await Promise.all([
        getAllAvailableCurrencies(),
        getActiveCurrencies(),
      ]);
      if (!mountedRef.current) return;
      setAllCurrencies(allCur);
      setCurrencies(activeCur);
    } catch (error) {
      console.error('Error refreshing currencies:', error);
    }
  }, []);

  const refreshVaults = useCallback(async () => {
    try {
      const vaultsData = await getVaults();
      if (!mountedRef.current) return;
      setVaults(vaultsData);
    } catch (error) {
      console.error('Error refreshing vaults:', error);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const accountsData = await getAccounts();
      if (!mountedRef.current) return;
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error refreshing accounts:', error);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    try {
      const txData = await getTransactions();
      if (!mountedRef.current) return;
      setTransactions(txData);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    }
  }, []);

  const refreshDebts = useCallback(async () => {
    try {
      const [debtData, debtPaymentsData, debtRemainingData] = await Promise.all([
        getDebts(),
        getDebtPayments(),
        getTotalDebtRemaining(),
      ]);
      if (!mountedRef.current) return;
      setDebts(debtData);
      setDebtPayments(debtPaymentsData);
      setDebtRemaining(debtRemainingData);
    } catch (error) {
      console.error('Error refreshing debts:', error);
    }
  }, []);

  const refreshDebtPayments = useCallback(async () => {
    try {
      const [debtPaymentsData, debtRemainingData] = await Promise.all([
        getDebtPayments(),
        getTotalDebtRemaining(),
      ]);
      if (!mountedRef.current) return;
      setDebtPayments(debtPaymentsData);
      setDebtRemaining(debtRemainingData);
    } catch (error) {
      console.error('Error refreshing debt payments:', error);
    }
  }, []);

  const refreshCurrencyExchanges = useCallback(async () => {
    try {
      const exchangeData = await getCurrencyExchanges();
      if (!mountedRef.current) return;
      setCurrencyExchanges(exchangeData);
    } catch (error) {
      console.error('Error refreshing currency exchanges:', error);
    }
  }, []);

  // ============================================
  // Debounced targeted refresh
  // Used by Realtime subscriptions to prevent rapid consecutive refreshes
  // ============================================
  const debouncedRefreshMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const debouncedRefresh = useCallback((table: string, refreshFn: () => Promise<void>) => {
    const existing = debouncedRefreshMap.current.get(table);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      debouncedRefreshMap.current.delete(table);
      refreshFn();
    }, REFRESH_DEBOUNCE_MS);

    debouncedRefreshMap.current.set(table, timer);
  }, []);

  // ============================================
  // Refs for Realtime callback functions
  // Using refs so the Realtime effect only runs ONCE and always
  // calls the latest callback versions without re-subscribing
  // ============================================
  const refreshCurrenciesRef = useRef(refreshCurrencies);
  const refreshVaultsRef = useRef(refreshVaults);
  const refreshAccountsRef = useRef(refreshAccounts);
  const refreshTransactionsRef = useRef(refreshTransactions);
  const refreshDebtsRef = useRef(refreshDebts);
  const refreshDebtPaymentsRef = useRef(refreshDebtPayments);
  const refreshCurrencyExchangesRef = useRef(refreshCurrencyExchanges);
  const debouncedRefreshRef = useRef(debouncedRefresh);
  const refreshDataRef = useRef(refreshData);

  // Keep refs up-to-date on every render
  refreshCurrenciesRef.current = refreshCurrencies;
  refreshVaultsRef.current = refreshVaults;
  refreshAccountsRef.current = refreshAccounts;
  refreshTransactionsRef.current = refreshTransactions;
  refreshDebtsRef.current = refreshDebts;
  refreshDebtPaymentsRef.current = refreshDebtPayments;
  refreshCurrencyExchangesRef.current = refreshCurrencyExchanges;
  debouncedRefreshRef.current = debouncedRefresh;
  refreshDataRef.current = refreshData;

  // ============================================
  // Realtime Subscriptions
  // 🔸 Effect runs ONCE on mount (empty dependency array)
  // 🔸 Uses refs to call latest callback versions
  // 🔸 Uses unique channel name to prevent "already subscribed" conflicts
  // 🔸 Skips subscription if Supabase tables don't exist
  // ============================================
  useEffect(() => {
    mountedRef.current = true;

    // Async setup: check tables exist before subscribing
    const setupRealtime = async () => {
      // Check if tables exist before attempting Realtime subscription
      const exist = await checkTablesExist();
      tablesExistRef.current = exist;

      if (!exist) {
        console.warn('Supabase Realtime: tables do not exist, skipping subscription');
        return;
      }

      // Use a unique channel name to prevent conflicts with stale channels
      // from React StrictMode double-mounting or hot reloads
      const channelId = `schema-db-changes-${Date.now()}`;

      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'currencies' }, () => {
          debouncedRefreshRef.current('currencies', () => refreshCurrenciesRef.current());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vaults' }, () => {
          // Vaults depend on currencies for total balance calculation
          debouncedRefreshRef.current('vaults', async () => {
            await refreshVaultsRef.current();
            // Also refresh total balance since it depends on vaults
            try {
              const totalUSD = await getTotalBalanceInUSD();
              if (mountedRef.current) setTotalBalanceUSD(totalUSD);
            } catch (e) {
              console.error('Error refreshing total balance:', e);
            }
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
          debouncedRefreshRef.current('accounts', () => refreshAccountsRef.current());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          debouncedRefreshRef.current('transactions', () => refreshTransactionsRef.current());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => {
          debouncedRefreshRef.current('debts', () => refreshDebtsRef.current());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'debt_payments' }, () => {
          debouncedRefreshRef.current('debt_payments', () => refreshDebtPaymentsRef.current());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'currency_exchanges' }, () => {
          debouncedRefreshRef.current('currency_exchanges', () => refreshCurrencyExchangesRef.current());
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            realtimeConnectedRef.current = true;
            console.log('Supabase Realtime: ✅ subscribed successfully');
            // Keep periodic polling even with Realtime — ensures cross-device sync reliability
            // (Realtime only works while tab is open; polling catches up after tab reactivation)
            if (!fallbackPollRef.current) {
              fallbackPollRef.current = setInterval(() => {
                refreshDataRef.current(true);
              }, FALLBACK_POLL_INTERVAL_MS);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            realtimeConnectedRef.current = false;
            console.warn('Supabase Realtime: ❌ subscription error, using polling only');
            // Start fallback polling if not already running
            if (!fallbackPollRef.current) {
              fallbackPollRef.current = setInterval(() => {
                refreshDataRef.current(true);
              }, FALLBACK_POLL_INTERVAL_MS);
            }
          }
        });

      channelRef.current = channel;

      // 🔸 ALWAYS start periodic polling for reliable cross-device sync
      // Even when Realtime works, polling ensures data consistency
      if (!fallbackPollRef.current) {
        fallbackPollRef.current = setInterval(() => {
          refreshDataRef.current(true);
        }, FALLBACK_POLL_INTERVAL_MS);
      }
    };

    setupRealtime();

    return () => {
      mountedRef.current = false;
      // Clean up debounced timers
      debouncedRefreshMap.current.forEach(timer => clearTimeout(timer));
      debouncedRefreshMap.current.clear();
      // Unsubscribe first, then remove channel
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // Clean up fallback polling
      if (fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
    };
  }, []); // Intentionally empty — uses refs for callbacks

  // ============================================
  // Initialization with retry + timeout
  // 🔸 Checks if Supabase is configured first
  // 🔸 More resilient error handling for cross-device support
  // ============================================
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const init = async () => {
      try {
        setIsLoading(true);
        setInitError(null);

        // 🔸 First: Check if Supabase client is configured
        if (!isSupabaseConfigured) {
          console.error('[Supabase] ❌ Client not configured — env vars missing');
          setTablesMissing(true);
          setInitError('لم يتم تكوين Supabase. تأكد من إضافة متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY');
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }

        console.log('[Supabase] 🔄 Initializing database...');

        await withRetry(async () => {
          if (cancelled) return;
          await initializeDatabase();
        });

        if (cancelled) return;

        // After initializeDatabase(), check if tables are missing
        const tablesDoExist = await checkTablesExist();
        tablesExistRef.current = tablesDoExist;

        if (!tablesDoExist) {
          console.warn('[Supabase] ⚠️ Tables missing — showing setup screen');
          setTablesMissing(true);
          setInitError('لم يتم العثور على جداول قاعدة البيانات. يرجى إعداد قاعدة البيانات أولاً.');
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }

        console.log('[Supabase] ✅ Tables exist, loading data...');
        setTablesMissing(false);
        await refreshData(true); // skipEvent=true to prevent event during init

        if (!cancelled) {
          setIsInitialized(true);
          console.log('[Supabase] ✅ Initialization complete!');
        }
      } catch (error) {
        console.error('[Supabase] ❌ Initialization failed:', error);
        if (!cancelled) {
          setInitError('فشل في تهيئة قاعدة البيانات. يرجى إعادة تحميل الصفحة.');
          setIsInitialized(true); // Allow entry to prevent white screen
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // Timeout: prevent infinite waiting
    timeoutId = setTimeout(() => {
      if (!cancelled && !isInitialized) {
        console.warn('[Supabase] ⏱️ Initialization timeout');
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
  // Listen for data refresh events (from other components)
  // ============================================
  useEffect(() => {
    let cancelled = false;

    const handleDataRefresh = async () => {
      if (cancelled || isRefreshingRef.current) return;
      await refreshData(true);
    };

    window.addEventListener('local-data-refreshed', handleDataRefresh);
    window.addEventListener('app-data-refreshed', handleDataRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('local-data-refreshed', handleDataRefresh);
      window.removeEventListener('app-data-refreshed', handleDataRefresh);
    };
  }, [refreshData]);

  // ============================================
  // Network restore: reload data when connection is back
  // ============================================
  useEffect(() => {
    let cancelled = false;

    const handleNetworkRestored = async () => {
      if (cancelled) return;
      console.log('Network restored - reloading data from Supabase');
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        await refreshData(true);
      } catch (error) {
        console.error('Error refreshing data after network restore:', error);
      }
    };

    window.addEventListener('app-network-restored', handleNetworkRestored);
    window.addEventListener('online', handleNetworkRestored);

    return () => {
      cancelled = true;
      window.removeEventListener('app-network-restored', handleNetworkRestored);
      window.removeEventListener('online', handleNetworkRestored);
    };
  }, [refreshData]);

  // ============================================
  // 🔸 Visibility change: reload data when user switches back to tab
  // 🔸 Critical for cross-device sync — data may have changed while tab was hidden
  // ============================================
  useEffect(() => {
    let cancelled = false;

    const handleVisibilityChange = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        console.log('[Supabase] 🔸 Tab became visible — refreshing data for cross-device sync');
        try {
          await refreshData(true, true); // forceRefresh to ensure latest data
        } catch (error) {
          console.error('Error refreshing data on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshData]);

  // ============================================
  // Calculate total balance dynamically from vaults + currencies
  // (same logic as useLocalData)
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

  // ============================================
  // Manual retry function
  // ============================================
  const retryInit = useCallback(async () => {
    setIsLoading(true);
    setInitError(null);
    resetInitializationState(); // Allow re-initialization after setup
    try {
      await initializeDatabase();

      // Check if tables now exist (after setup)
      const tablesDoExist = await checkTablesExist();
      tablesExistRef.current = tablesDoExist;

      if (!tablesDoExist) {
        // Still no tables — keep showing setup screen
        setTablesMissing(true);
        setInitError('لم يتم العثور على جداول قاعدة البيانات. يرجى إعداد قاعدة البيانات أولاً.');
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      // Tables exist now! Clear the missing flag and reload data
      setTablesMissing(false);
      await refreshData(true);
      setIsInitialized(true);

      // Set up Realtime subscription if we don't have one yet
      if (!channelRef.current) {
        const channelId = `schema-db-changes-${Date.now()}`;
        const channel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'currencies' }, () => {
            debouncedRefreshRef.current('currencies', () => refreshCurrenciesRef.current());
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vaults' }, () => {
            debouncedRefreshRef.current('vaults', async () => {
              await refreshVaultsRef.current();
              try {
                const totalUSD = await getTotalBalanceInUSD();
                if (mountedRef.current) setTotalBalanceUSD(totalUSD);
              } catch (e) {
                console.error('Error refreshing total balance:', e);
              }
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
            debouncedRefreshRef.current('accounts', () => refreshAccountsRef.current());
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
            debouncedRefreshRef.current('transactions', () => refreshTransactionsRef.current());
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => {
            debouncedRefreshRef.current('debts', () => refreshDebtsRef.current());
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'debt_payments' }, () => {
            debouncedRefreshRef.current('debt_payments', () => refreshDebtPaymentsRef.current());
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'currency_exchanges' }, () => {
            debouncedRefreshRef.current('currency_exchanges', () => refreshCurrencyExchangesRef.current());
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              realtimeConnectedRef.current = true;
              console.log('Supabase Realtime: subscribed after retry');
            }
          });
        channelRef.current = channel;
      }
    } catch (error) {
      console.error('Retry init failed:', error);
      const msg = error instanceof Error ? error.message : 'فشلت إعادة المحاولة';
      setInitError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  // ============================================
  // Manual sync: force refresh from Supabase
  // 🔸 Used by the sync button in the header
  // ============================================
  const manualSync = useCallback(async () => {
    console.log('[Supabase] 🔄 Manual sync triggered');
    resetInitializationState();
    await refreshData(false, true); // forceRefresh=true
  }, [refreshData]);

  // ============================================
  // Return: EXACT same interface as useLocalData
  // ============================================
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
    tablesMissing,
    realtimeConnected: realtimeConnectedRef.current,

    // Actions
    refreshData,
    retryInit,
    manualSync,
    setCurrencies,
    setVaults,
    setAccounts,
    setTransactions,
    setDebts,
    setDebtPayments,
    setCurrencyExchanges,

    // Currency actions
    activateCurrency: async (currencyId: string, exchangeRate?: number): Promise<Currency> => {
      try {
        const result = await activateCurrency(currencyId, exchangeRate);
        // Realtime will auto-refresh, but also refresh as fallback
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error activating currency:', error);
        throw error;
      }
    },
    deactivateCurrency: async (currencyId: string): Promise<void> => {
      try {
        await deactivateCurrency(currencyId);
        await refreshData();
      } catch (error) {
        console.error('Error deactivating currency:', error);
        throw error;
      }
    },
    updateCurrencyExchangeRate: async (currencyId: string, rate: number): Promise<Currency> => {
      try {
        const result = await updateCurrencyExchangeRate(currencyId, rate);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating exchange rate:', error);
        throw error;
      }
    },
    updateCurrencyConversionMethod: async (currencyId: string, method: 'MULTIPLY' | 'DIVIDE'): Promise<Currency> => {
      try {
        const result = await updateCurrencyConversionMethod(currencyId, method);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating conversion method:', error);
        throw error;
      }
    },

    // Vault actions
    updateVaultOpeningBalance: async (currencyId: string, balance: number): Promise<Vault | null> => {
      try {
        const result = await updateVaultOpeningBalance(currencyId, balance);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating vault balance:', error);
        throw error;
      }
    },

    // Account actions
    addAccount: async (data: Partial<Account>): Promise<Account> => {
      try {
        const result = await addAccount(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding account:', error);
        throw error;
      }
    },
    updateAccount: async (id: string, data: Partial<Account>): Promise<Account> => {
      try {
        const result = await updateAccount(id, data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating account:', error);
        throw error;
      }
    },
    deleteAccount: async (id: string): Promise<void> => {
      try {
        await deleteAccount(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting account:', error);
        throw error;
      }
    },

    // Transaction actions
    addTransaction: async (data: Parameters<typeof addTransaction>[0]): Promise<{ success: boolean; data?: Transaction; error?: string }> => {
      try {
        const result = await addTransaction(data);
        await refreshData(false, true); // forceRefresh=true to ensure UI updates
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    updateTransaction: async (id: string, data: Partial<Transaction>): Promise<{ success: boolean; data?: Transaction; error?: string }> => {
      try {
        const result = await updateTransaction(id, data);
        await refreshData(false, true); // forceRefresh=true
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    deleteTransaction: async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await deleteTransaction(id);
        await refreshData(false, true); // forceRefresh=true
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },

    // Debt actions
    addDebt: async (data: Parameters<typeof addDebt>[0]): Promise<Debt> => {
      try {
        const result = await addDebt(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding debt:', error);
        throw error;
      }
    },
    updateDebt: async (id: string, data: Partial<Debt>): Promise<Debt> => {
      try {
        const result = await updateDebt(id, data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error updating debt:', error);
        throw error;
      }
    },
    deleteDebt: async (id: string): Promise<void> => {
      try {
        await deleteDebt(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting debt:', error);
        throw error;
      }
    },

    // Debt Payment actions
    addDebtPayment: async (data: Parameters<typeof addDebtPayment>[0]): Promise<DebtPayment> => {
      try {
        const result = await addDebtPayment(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding debt payment:', error);
        throw error;
      }
    },
    deleteDebtPayment: async (id: string): Promise<void> => {
      try {
        await deleteDebtPayment(id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting debt payment:', error);
        throw error;
      }
    },

    // Currency Exchange actions
    addCurrencyExchange: async (data: Parameters<typeof addCurrencyExchange>[0]): Promise<CurrencyExchange> => {
      try {
        const result = await addCurrencyExchange(data);
        await refreshData();
        return result;
      } catch (error) {
        console.error('Error adding exchange:', error);
        throw error;
      }
    },
    deleteCurrencyExchange: async (id: string): Promise<void> => {
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
