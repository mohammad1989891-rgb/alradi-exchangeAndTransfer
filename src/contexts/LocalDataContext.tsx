'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  initializeDatabase,
  getAllAvailableCurrencies,
  getActiveCurrencies,
  getVaults,
  getAccounts,
  getTransactions,
  getDebts,
  getTotalBalanceInUSD,
  activateCurrency as dbActivateCurrency,
  deactivateCurrency as dbDeactivateCurrency,
  updateCurrencyExchangeRate as dbUpdateCurrencyExchangeRate,
  updateVaultOpeningBalance as dbUpdateVaultOpeningBalance,
  addAccount as dbAddAccount,
  updateAccount as dbUpdateAccount,
  deleteAccount as dbDeleteAccount,
  addTransaction as dbAddTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  addDebt as dbAddDebt,
  updateDebt as dbUpdateDebt,
  deleteDebt as dbDeleteDebt,
  getDebtPayments as dbGetDebtPayments,
  addDebtPayment as dbAddDebtPayment,
  deleteDebtPayment as dbDeleteDebtPayment,
  addAccountDebtPayment as dbAddAccountDebtPayment,
  getAccountDebtPayments as dbGetAccountDebtPayments,
  getAccountDebtSummary as dbGetAccountDebtSummary,
  getTotalDebtRemaining as dbGetTotalDebtRemaining,
  exportAllData as dbExportAllData,
  importAllData as dbImportAllData,
  clearAllData as dbClearAllData,
} from '@/lib/supabaseDb';
import type { Currency, Vault, Account, Transaction, Debt, DebtPayment } from '@/lib/supabaseDb';

interface LocalDataContextType {
  // Data
  currencies: Currency[];
  allCurrencies: Currency[];
  vaults: Vault[];
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  totalBalanceUSD: number;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  
  // Currency actions
  activateCurrency: (currencyId: string, exchangeRate?: number) => Promise<Currency>;
  deactivateCurrency: (currencyId: string) => Promise<void>;
  updateCurrencyExchangeRate: (currencyId: string, rate: number) => Promise<Currency>;
  
  // Vault actions
  updateVaultOpeningBalance: (currencyId: string, balance: number) => Promise<Vault | null>;
  
  // Account actions
  addAccount: (data: Partial<Account>) => Promise<Account>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Transaction actions
  addTransaction: (data: Parameters<typeof dbAddTransaction>[0]) => Promise<{ success: boolean; data?: Transaction; error?: string }>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<{ success: boolean; data?: Transaction; error?: string }>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Debt actions
  addDebt: (data: Parameters<typeof dbAddDebt>[0]) => Promise<Debt>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<Debt>;
  deleteDebt: (id: string) => Promise<void>;
  
  // Debt Payment actions
  getDebtPayments: (debtId: string) => Promise<DebtPayment[]>;
  addDebtPayment: (data: { debtId: string; amount: number; note?: string; date: string }) => Promise<DebtPayment>;
  deleteDebtPayment: (paymentId: string) => Promise<void>;
  
  // Account Debt Payment actions
  addAccountDebtPayment: (data: { accountId: string; amount: number; note?: string; date: string; currencyId?: string }) => Promise<{ payment: DebtPayment | null; excessAmount: number }>;
  getAccountDebtPayments: (accountId: string) => Promise<(DebtPayment & { debt?: Debt })[]>;
  getAccountDebtSummary: (accountId: string) => Promise<{ totalDebts: number; totalPaid: number; totalRemaining: number; debtsCount: number; paidDebtsCount: number }>;
  getTotalDebtRemaining: () => Promise<{ totalDebts: number; totalPaid: number; totalRemaining: number; unpaidDebtsCount: number; paidDebtsCount: number }>;
  
  // Backup & Restore
  exportAllData: () => Promise<{
    currencies: Currency[];
    vaults: Vault[];
    accounts: Account[];
    transactions: Transaction[];
    debts: Debt[];
    debtPayments: DebtPayment[];
    exportDate: string;
    version: string;
  }>;
  importAllData: (data: any, mergeMode?: boolean) => Promise<{ success: boolean; message: string; stats?: { added: number; updated: number; skipped: number } }>;
  clearAllData: () => Promise<{ success: boolean; message: string }>;
}

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load all data
  const refreshData = useCallback(async () => {
    try {
      const [allCur, activeCur, vaultsData, accountsData, txData, debtData, totalUSD] = await Promise.all([
        getAllAvailableCurrencies(),
        getActiveCurrencies(),
        getVaults(),
        getAccounts(),
        getTransactions(),
        getDebts(),
        getTotalBalanceInUSD(),
      ]);
      
      setAllCurrencies(allCur);
      setCurrencies(activeCur);
      setVaults(vaultsData);
      setAccounts(accountsData);
      setTransactions(txData);
      setDebts(debtData);
      setTotalBalanceUSD(totalUSD);
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
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshData]);

  const value: LocalDataContextType = {
    // Data
    currencies,
    allCurrencies,
    vaults,
    accounts,
    transactions,
    debts,
    totalBalanceUSD,
    isLoading,
    isInitialized,
    
    // Actions
    refreshData,
    
    // Currency actions
    activateCurrency: async (currencyId: string, exchangeRate?: number) => {
      const result = await dbActivateCurrency(currencyId, exchangeRate);
      await refreshData();
      return result;
    },
    deactivateCurrency: async (currencyId: string) => {
      await dbDeactivateCurrency(currencyId);
      await refreshData();
    },
    updateCurrencyExchangeRate: async (currencyId: string, rate: number) => {
      const result = await dbUpdateCurrencyExchangeRate(currencyId, rate);
      await refreshData();
      return result;
    },
    
    // Vault actions
    updateVaultOpeningBalance: async (currencyId: string, balance: number) => {
      const result = await dbUpdateVaultOpeningBalance(currencyId, balance);
      await refreshData();
      return result;
    },
    
    // Account actions
    addAccount: async (data: Partial<Account>) => {
      const result = await dbAddAccount(data);
      await refreshData();
      return result;
    },
    updateAccount: async (id: string, data: Partial<Account>) => {
      const result = await dbUpdateAccount(id, data);
      await refreshData();
      return result;
    },
    deleteAccount: async (id: string) => {
      await dbDeleteAccount(id);
      await refreshData();
    },
    
    // Transaction actions
    addTransaction: async (data: Parameters<typeof dbAddTransaction>[0]) => {
      try {
        const result = await dbAddTransaction(data);
        await refreshData();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    updateTransaction: async (id: string, data: Partial<Transaction>) => {
      try {
        const result = await dbUpdateTransaction(id, data);
        await refreshData();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    deleteTransaction: async (id: string) => {
      try {
        await dbDeleteTransaction(id);
        await refreshData();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ' };
      }
    },
    
    // Debt actions
    addDebt: async (data: Parameters<typeof dbAddDebt>[0]) => {
      const result = await dbAddDebt(data);
      await refreshData();
      return result;
    },
    updateDebt: async (id: string, data: Partial<Debt>) => {
      const result = await dbUpdateDebt(id, data);
      await refreshData();
      return result;
    },
    deleteDebt: async (id: string) => {
      await dbDeleteDebt(id);
      await refreshData();
    },
    
    // Debt Payment actions
    getDebtPayments: async (debtId: string) => {
      return dbGetDebtPayments(debtId);
    },
    addDebtPayment: async (data: { debtId: string; amount: number; note?: string; date: string }) => {
      const result = await dbAddDebtPayment(data);
      await refreshData();
      return result;
    },
    deleteDebtPayment: async (paymentId: string) => {
      await dbDeleteDebtPayment(paymentId);
      await refreshData();
    },
    
    // Account Debt Payment actions
    addAccountDebtPayment: async (data: { accountId: string; amount: number; note?: string; date: string; currencyId?: string }) => {
      const result = await dbAddAccountDebtPayment(data);
      await refreshData();
      return result;
    },
    getAccountDebtPayments: async (accountId: string) => {
      return dbGetAccountDebtPayments(accountId);
    },
    getAccountDebtSummary: async (accountId: string) => {
      return dbGetAccountDebtSummary(accountId);
    },
    getTotalDebtRemaining: async () => {
      return dbGetTotalDebtRemaining();
    },
    
    // Backup & Restore
    exportAllData: async () => {
      return dbExportAllData();
    },
    importAllData: async (data: any, mergeMode: boolean = true) => {
      const result = await dbImportAllData(data, mergeMode);
      await refreshData();
      return result;
    },
    clearAllData: async () => {
      const result = await dbClearAllData();
      await refreshData();
      return result;
    },
  };

  return (
    <LocalDataContext.Provider value={value}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useSupabaseData() {
  const context = useContext(LocalDataContext);
  if (context === undefined) {
    throw new Error('useLocalData must be used within a LocalDataProvider');
  }
  return context;
}
