'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import {
  initializeDatabase,
  getAllAvailableCurrencies,
  getActiveCurrencies,
  getVaults,
  getAccounts,
  getTransactions,
  getDebts,
  getExchanges,
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
  addExchange,
  deleteExchange,
} from '@/lib/localDb';
import type { Currency, Vault, Account, Transaction, Debt, DebtPayment, Exchange } from '@/lib/localDb';

interface DataContextValue {
  // Data
  currencies: Currency[];
  allCurrencies: Currency[];
  vaults: Vault[];
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  exchanges: Exchange[];
  totalBalanceUSD: number;
  debtRemaining: {
    totalDebts: number;
    totalPaid: number;
    totalRemaining: number;
    unpaidDebtsCount: number;
    paidDebtsCount: number;
  };
  isLoading: boolean;
  isInitialized: boolean;
  
  // Refresh function
  refreshData: () => Promise<void>;
  
  // Currency actions
  activateCurrency: (currencyId: string, exchangeRate?: number, conversionMethod?: 'MULTIPLY' | 'DIVIDE') => Promise<Currency | undefined>;
  deactivateCurrency: (currencyId: string) => Promise<void>;
  updateCurrencyExchangeRate: (currencyId: string, rate: number) => Promise<Vault | undefined>;
  updateCurrencyConversionMethod: (currencyId: string, method: 'MULTIPLY' | 'DIVIDE') => Promise<Currency | undefined>;
  
  // Vault actions
  updateVaultOpeningBalance: (currencyId: string, balance: number) => Promise<Vault | undefined>;
  
  // Account actions
  addAccount: (data: Partial<Account>) => Promise<Account>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Transaction actions
  addTransaction: (data: Parameters<typeof addTransaction>[0]) => Promise<{ success: boolean; data?: Transaction; error?: string }>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<{ success: boolean; data?: Transaction; error?: string }>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Debt actions
  addDebt: (data: Parameters<typeof addDebt>[0]) => Promise<Debt>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<Debt>;
  deleteDebt: (id: string) => Promise<void>;
  
  // Debt Payment actions
  addDebtPayment: (data: Parameters<typeof addDebtPayment>[0]) => Promise<DebtPayment>;
  deleteDebtPayment: (id: string) => Promise<void>;
  
  // Exchange actions
  addExchange: (data: Parameters<typeof addExchange>[0]) => Promise<{ success: boolean; data?: Exchange; error?: string }>;
  deleteExchange: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);
  const [debtRemaining, setDebtRemaining] = useState({
    totalDebts: 0,
    totalPaid: 0,
    totalRemaining: 0,
    unpaidDebtsCount: 0,
    paidDebtsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use ref to prevent multiple refreshes
  const isRefreshing = useRef(false);

  // Load all data - single source of truth
  const refreshData = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    
    try {
      const [allCur, activeCur, vaultsData, accountsData, txData, debtData, debtPaymentsData, exchangesData, totalUSD, debtRemainingData] = await Promise.all([
        getAllAvailableCurrencies(),
        getActiveCurrencies(),
        getVaults(),
        getAccounts(),
        getTransactions(),
        getDebts(),
        getDebtPayments(),
        getExchanges(),
        getTotalBalanceInUSD(),
        getTotalDebtRemaining(),
      ]);

      setAllCurrencies(allCur);
      setCurrencies(activeCur);
      setVaults(vaultsData);
      setAccounts(accountsData);
      setTransactions(txData);
      setDebts(debtData);
      setDebtPayments(debtPaymentsData);
      setExchanges(exchangesData);
      setTotalBalanceUSD(totalUSD);
      setDebtRemaining(debtRemainingData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  // Initialize on mount only once
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await initializeDatabase();
        await refreshData();
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshData]);

  // Currency actions
  const handleActivateCurrency = useCallback(async (currencyId: string, exchangeRate?: number, conversionMethod?: 'MULTIPLY' | 'DIVIDE') => {
    const result = await activateCurrency(currencyId, exchangeRate, conversionMethod);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleDeactivateCurrency = useCallback(async (currencyId: string) => {
    await deactivateCurrency(currencyId);
    await refreshData();
  }, [refreshData]);

  const handleUpdateCurrencyExchangeRate = useCallback(async (currencyId: string, rate: number) => {
    const result = await updateCurrencyExchangeRate(currencyId, rate);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleUpdateCurrencyConversionMethod = useCallback(async (currencyId: string, method: 'MULTIPLY' | 'DIVIDE') => {
    const result = await updateCurrencyConversionMethod(currencyId, method);
    await refreshData();
    return result;
  }, [refreshData]);

  // Vault actions
  const handleUpdateVaultOpeningBalance = useCallback(async (currencyId: string, balance: number) => {
    const result = await updateVaultOpeningBalance(currencyId, balance);
    await refreshData();
    return result;
  }, [refreshData]);

  // Account actions
  const handleAddAccount = useCallback(async (data: Partial<Account>) => {
    const result = await addAccount(data);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleUpdateAccount = useCallback(async (id: string, data: Partial<Account>) => {
    const result = await updateAccount(id, data);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleDeleteAccount = useCallback(async (id: string) => {
    await deleteAccount(id);
    await refreshData();
  }, [refreshData]);

  // Transaction actions
  const handleAddTransaction = useCallback(async (data: Parameters<typeof addTransaction>[0]) => {
    try {
      const result = await addTransaction(data);
      await refreshData();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
    }
  }, [refreshData]);

  const handleUpdateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    try {
      const result = await updateTransaction(id, data);
      await refreshData();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
    }
  }, [refreshData]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      await deleteTransaction(id);
      await refreshData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
    }
  }, [refreshData]);

  // Debt actions
  const handleAddDebt = useCallback(async (data: Parameters<typeof addDebt>[0]) => {
    const result = await addDebt(data);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleUpdateDebt = useCallback(async (id: string, data: Partial<Debt>) => {
    const result = await updateDebt(id, data);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleDeleteDebt = useCallback(async (id: string) => {
    await deleteDebt(id);
    await refreshData();
  }, [refreshData]);

  // Debt Payment actions
  const handleAddDebtPayment = useCallback(async (data: Parameters<typeof addDebtPayment>[0]) => {
    const result = await addDebtPayment(data);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleDeleteDebtPayment = useCallback(async (id: string) => {
    await deleteDebtPayment(id);
    await refreshData();
  }, [refreshData]);

  // Exchange actions
  const handleAddExchange = useCallback(async (data: Parameters<typeof addExchange>[0]) => {
    try {
      const result = await addExchange(data);
      await refreshData();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
    }
  }, [refreshData]);

  const handleDeleteExchange = useCallback(async (id: string) => {
    try {
      await deleteExchange(id);
      await refreshData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
    }
  }, [refreshData]);

  const value: DataContextValue = {
    currencies,
    allCurrencies,
    vaults,
    accounts,
    transactions,
    debts,
    debtPayments,
    exchanges,
    totalBalanceUSD,
    debtRemaining,
    isLoading,
    isInitialized,
    refreshData,
    activateCurrency: handleActivateCurrency,
    deactivateCurrency: handleDeactivateCurrency,
    updateCurrencyExchangeRate: handleUpdateCurrencyExchangeRate,
    updateCurrencyConversionMethod: handleUpdateCurrencyConversionMethod,
    updateVaultOpeningBalance: handleUpdateVaultOpeningBalance,
    addAccount: handleAddAccount,
    updateAccount: handleUpdateAccount,
    deleteAccount: handleDeleteAccount,
    addTransaction: handleAddTransaction,
    updateTransaction: handleUpdateTransaction,
    deleteTransaction: handleDeleteTransaction,
    addDebt: handleAddDebt,
    updateDebt: handleUpdateDebt,
    deleteDebt: handleDeleteDebt,
    addDebtPayment: handleAddDebtPayment,
    deleteDebtPayment: handleDeleteDebtPayment,
    addExchange: handleAddExchange,
    deleteExchange: handleDeleteExchange,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
