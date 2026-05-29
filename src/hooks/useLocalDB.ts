'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  currencyDB,
  vaultDB,
  accountDB,
  transactionDB,
  debtDB,
  accountVaultDB,
  generateId,
  initializeDefaultData,
  exportData,
  importData,
} from '@/lib/db-local';
import type { Currency, Vault, Account, Transaction, Debt, AccountVault, TransactionFormData, DebtFormData, AccountFormData } from '@/types';

// Hook for managing all data
export function useSupabaseData() {
  const {
    setCurrencies,
    setVaults,
    setAccounts,
    setTransactions,
    setDebts,
    setAccountVaults,
    setIsLoading,
  } = useAppStore();

  // Load all data from IndexedDB
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await initializeDefaultData();
      
      const [currencies, vaults, accounts, transactions, debts, accountVaults] = await Promise.all([
        currencyDB.getAll(),
        vaultDB.getAll(),
        accountDB.getAll(),
        transactionDB.getAll(),
        debtDB.getAll(),
        accountVaultDB.getAll(),
      ]);

      // Enrich vaults and transactions with currency data
      const enrichedVaults = vaults.map(vault => ({
        ...vault,
        currency: currencies.find(c => c.id === vault.currencyId),
      }));

      const enrichedTransactions = transactions.map(tx => ({
        ...tx,
        account: accounts.find(a => a.id === tx.accountId),
        currency: currencies.find(c => c.id === tx.currencyId),
        baseCurrency: tx.baseCurrencyId ? currencies.find(c => c.id === tx.baseCurrencyId) : null,
      }));

      const enrichedDebts = debts.map(debt => ({
        ...debt,
        account: accounts.find(a => a.id === debt.accountId),
        currency: currencies.find(c => c.id === debt.currencyId),
      }));

      // Enrich account vaults
      const enrichedAccountVaults = accountVaults.map(av => ({
        ...av,
        currency: currencies.find(c => c.id === av.currencyId),
        account: accounts.find(a => a.id === av.accountId),
      }));

      // Count transactions and debts for accounts, and attach their vaults
      const enrichedAccounts = accounts.map(account => ({
        ...account,
        vaults: enrichedAccountVaults.filter(av => av.accountId === account.id),
        _count: {
          transactions: transactions.filter(t => t.accountId === account.id).length,
          debts: debts.filter(d => d.accountId === account.id).length,
        },
      }));

      setCurrencies(currencies);
      setVaults(enrichedVaults);
      setAccounts(enrichedAccounts);
      setTransactions(enrichedTransactions);
      setDebts(enrichedDebts);
      setAccountVaults(enrichedAccountVaults);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrencies, setVaults, setAccounts, setTransactions, setDebts, setAccountVaults, setIsLoading]);

  // Initialize on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return { loadData };
}

// Currency operations
export function useCurrencies() {
  const { currencies, setCurrencies } = useAppStore();

  const addCurrency = useCallback(async (data: Partial<Currency>) => {
    const now = new Date().toISOString();
    const currency: Currency = {
      id: generateId(),
      code: data.code || '',
      name: data.name || '',
      symbol: data.symbol || '',
      isDefault: data.isDefault || false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await currencyDB.add(currency);
    
    // Create main vault for currency
    await vaultDB.add({
      id: generateId(),
      currencyId: currency.id,
      balance: 0,
      openingBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    setCurrencies([...currencies, currency]);
    return currency;
  }, [currencies, setCurrencies]);

  const updateCurrency = useCallback(async (id: string, data: Partial<Currency>) => {
    const existing = currencies.find(c => c.id === id);
    if (!existing) return null;
    
    const updated: Currency = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await currencyDB.update(updated);
    setCurrencies(currencies.map(c => c.id === id ? updated : c));
    return updated;
  }, [currencies, setCurrencies]);

  const deleteCurrency = useCallback(async (id: string) => {
    await currencyDB.delete(id);
    await vaultDB.delete((await vaultDB.getByCurrency(id))[0]?.id || '');
    setCurrencies(currencies.filter(c => c.id !== id));
  }, [currencies, setCurrencies]);

  return { currencies, addCurrency, updateCurrency, deleteCurrency };
}

// Account operations with automatic vault creation
export function useAccounts() {
  const { accounts, setAccounts, transactions, debts, currencies, accountVaults, setAccountVaults } = useAppStore();

  const addAccount = useCallback(async (data: AccountFormData) => {
    const now = new Date().toISOString();
    const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0];
    
    const account: Account = {
      id: generateId(),
      name: data.name,
      type: data.type,
      description: data.description || null,
      defaultCurrencyId: defaultCurrency?.id || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      _count: { transactions: 0, debts: 0 },
      vaults: [],
    };
    await accountDB.add(account);
    
    // Create default account vault with default currency (USD)
    const accountVault: AccountVault = {
      id: generateId(),
      accountId: account.id,
      currencyId: defaultCurrency?.id || '',
      balance: 0,
      openingBalance: 0,
      isDefault: true,
      currency: defaultCurrency,
      account: account,
      createdAt: now,
      updatedAt: now,
    };
    await accountVaultDB.add(accountVault);
    
    account.vaults = [accountVault];
    setAccounts([...accounts, account]);
    setAccountVaults([...accountVaults, accountVault]);
    return account;
  }, [accounts, setAccounts, currencies, accountVaults, setAccountVaults]);

  const updateAccount = useCallback(async (id: string, data: AccountFormData) => {
    const existing = accounts.find(a => a.id === id);
    if (!existing) return null;
    
    const updated: Account = {
      ...existing,
      name: data.name,
      type: data.type,
      description: data.description || null,
      updatedAt: new Date().toISOString(),
    };
    await accountDB.update(updated);
    setAccounts(accounts.map(a => a.id === id ? updated : a));
    return updated;
  }, [accounts, setAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    await accountDB.delete(id);
    // Delete all account vaults
    const avs = accountVaults.filter(av => av.accountId === id);
    for (const av of avs) {
      await accountVaultDB.delete(av.id);
    }
    setAccounts(accounts.filter(a => a.id !== id));
    setAccountVaults(accountVaults.filter(av => av.accountId !== id));
  }, [accounts, setAccounts, accountVaults, setAccountVaults]);

  return { accounts, addAccount, updateAccount, deleteAccount };
}

// Account Vault operations
export function useAccountVaults() {
  const { accountVaults, setAccountVaults, accounts, setAccounts, currencies } = useAppStore();

  const addAccountVault = useCallback(async (accountId: string, currencyId: string) => {
    const now = new Date().toISOString();
    const account = accounts.find(a => a.id === accountId);
    const currency = currencies.find(c => c.id === currencyId);
    
    // Check if vault already exists for this account and currency
    const existing = accountVaults.find(av => av.accountId === accountId && av.currencyId === currencyId);
    if (existing) return existing;
    
    const accountVault: AccountVault = {
      id: generateId(),
      accountId,
      currencyId,
      balance: 0,
      openingBalance: 0,
      isDefault: false,
      currency,
      account,
      createdAt: now,
      updatedAt: now,
    };
    
    await accountVaultDB.add(accountVault);
    setAccountVaults([...accountVaults, accountVault]);
    
    // Update account's vaults
    if (account) {
      const updatedAccount = {
        ...account,
        vaults: [...(account.vaults || []), accountVault],
      };
      setAccounts(accounts.map(a => a.id === accountId ? updatedAccount : a));
    }
    
    return accountVault;
  }, [accountVaults, setAccountVaults, accounts, setAccounts, currencies]);

  const setDefaultVault = useCallback(async (accountId: string, vaultId: string) => {
    const now = new Date().toISOString();
    const accountVs = accountVaults.filter(av => av.accountId === accountId);
    
    // Update all vaults for this account
    const updatedVaults: AccountVault[] = [];
    for (const av of accountVs) {
      const updated = {
        ...av,
        isDefault: av.id === vaultId,
        updatedAt: now,
      };
      await accountVaultDB.update(updated);
      updatedVaults.push(updated);
    }
    
    // Update state
    setAccountVaults(accountVaults.map(av => 
      av.accountId === accountId 
        ? updatedVaults.find(uv => uv.id === av.id) || av 
        : av
    ));
    
    // Update account's default currency
    const newDefaultVault = updatedVaults.find(av => av.isDefault);
    if (newDefaultVault) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        const updatedAccount = {
          ...account,
          defaultCurrencyId: newDefaultVault.currencyId,
          vaults: updatedVaults,
        };
        setAccounts(accounts.map(a => a.id === accountId ? updatedAccount : a));
      }
    }
  }, [accountVaults, setAccountVaults, accounts, setAccounts]);

  const updateVaultBalance = useCallback(async (vaultId: string, amount: number, operation: 'add' | 'subtract') => {
    const vault = accountVaults.find(av => av.id === vaultId);
    if (!vault) return null;
    
    const newBalance = operation === 'add' 
      ? vault.balance + amount 
      : vault.balance - amount;
    
    const now = new Date().toISOString();
    const updated: AccountVault = {
      ...vault,
      balance: newBalance,
      updatedAt: now,
    };
    
    await accountVaultDB.update(updated);
    setAccountVaults(accountVaults.map(av => av.id === vaultId ? updated : av));
    
    // Update account's vaults
    const account = accounts.find(a => a.id === vault.accountId);
    if (account) {
      const updatedAccount = {
        ...account,
        vaults: account.vaults?.map(v => v.id === vaultId ? updated : v),
      };
      setAccounts(accounts.map(a => a.id === vault.accountId ? updatedAccount : a));
    }
    
    return updated;
  }, [accountVaults, setAccountVaults, accounts, setAccounts]);

  const getAccountVault = useCallback((accountId: string, currencyId: string) => {
    return accountVaults.find(av => av.accountId === accountId && av.currencyId === currencyId);
  }, [accountVaults]);

  const getDefaultVault = useCallback((accountId: string) => {
    return accountVaults.find(av => av.accountId === accountId && av.isDefault);
  }, [accountVaults]);

  return { 
    accountVaults, 
    addAccountVault, 
    setDefaultVault, 
    updateVaultBalance,
    getAccountVault,
    getDefaultVault 
  };
}

// Transaction operations - uses Account Vaults
export function useTransactions() {
  const { transactions, setTransactions, currencies, accounts, accountVaults, setAccountVaults } = useAppStore();

  const calculateFinalBalance = (data: TransactionFormData): number => {
    let amount = data.amount;
    
    // Apply conversion
    if (data.conversionMethod === 'MULTIPLY') {
      amount = amount * data.conversionFactor;
    } else {
      amount = amount / data.conversionFactor;
    }
    
    // Apply fees
    let fees = 0;
    if (data.feesType === 'FIXED') {
      fees = data.feesAmount;
    } else if (data.feesType === 'PERCENTAGE') {
      fees = amount * (data.feesAmount / 100);
    } else if (data.feesType === 'PER_THOUSAND') {
      fees = amount * (data.feesAmount / 1000);
    }
    
    if (data.feesDirection === 'INCOME') {
      amount += fees;
    } else {
      amount -= fees;
    }
    
    return Math.round(amount * 100) / 100;
  };

  const addTransaction = useCallback(async (data: TransactionFormData) => {
    const now = new Date().toISOString();
    const finalBalance = calculateFinalBalance(data);
    
    const transaction: Transaction = {
      id: generateId(),
      accountId: data.accountId,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId || null,
      type: data.type,
      paymentType: data.paymentType,
      amount: data.amount,
      conversionFactor: data.conversionFactor,
      conversionMethod: data.conversionMethod,
      feesType: data.feesType,
      feesDirection: data.feesDirection,
      feesAmount: data.feesAmount,
      finalBalance,
      description: data.description || null,
      date: data.date,
      createdAt: now,
      updatedAt: now,
      account: accounts.find(a => a.id === data.accountId),
      currency: currencies.find(c => c.id === data.currencyId),
      baseCurrency: data.baseCurrencyId ? currencies.find(c => c.id === data.baseCurrencyId) : null,
    };

    await transactionDB.add(transaction);

    // Update account vault balance ONLY for CASH transactions
    // The BASE AMOUNT affects the account's BASE CURRENCY vault
    if (data.paymentType === 'CASH' && data.baseCurrencyId) {
      const accountVault = accountVaults.find(
        av => av.accountId === data.accountId && av.currencyId === data.baseCurrencyId
      );
      
      if (accountVault) {
        // INCOME (لنا) + CASH = we GIVE base currency to customer = vault DECREASES
        // EXPENSE (علينا) + CASH = we RECEIVE base currency from customer = vault INCREASES
        const newBalance = data.type === 'INCOME' 
          ? accountVault.balance - data.amount 
          : accountVault.balance + data.amount;
        
        const updatedVault = { ...accountVault, balance: newBalance, updatedAt: now };
        await accountVaultDB.update(updatedVault);
        setAccountVaults(accountVaults.map(av => av.id === accountVault.id ? updatedVault : av));
      }
    }

    setTransactions([...transactions, transaction]);
    return transaction;
  }, [transactions, setTransactions, currencies, accounts, accountVaults, setAccountVaults]);

  const updateTransaction = useCallback(async (id: string, data: TransactionFormData) => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) return null;

    const finalBalance = calculateFinalBalance(data);
    const now = new Date().toISOString();
    
    // Handle vault changes - revert old and apply new
    if (existing.paymentType === 'CASH' && existing.baseCurrencyId) {
      const oldVault = accountVaults.find(
        av => av.accountId === existing.accountId && av.currencyId === existing.baseCurrencyId
      );
      
      if (oldVault) {
        // Revert old vault balance
        const revertedBalance = existing.type === 'INCOME'
          ? oldVault.balance + existing.amount
          : oldVault.balance - existing.amount;
        
        // Apply new transaction if it's also CASH
        if (data.paymentType === 'CASH' && data.baseCurrencyId) {
          const newVault = accountVaults.find(
            av => av.accountId === data.accountId && av.currencyId === data.baseCurrencyId
          ) || oldVault;
          
          const targetBalance = data.baseCurrencyId === existing.baseCurrencyId 
            ? revertedBalance 
            : newVault.balance;
          
          const newBalance = data.type === 'INCOME'
            ? targetBalance - data.amount
            : targetBalance + data.amount;
          
          const updatedVault = { ...newVault, balance: newBalance, updatedAt: now };
          await accountVaultDB.update(updatedVault);
          setAccountVaults(accountVaults.map(av => av.id === newVault.id ? updatedVault : av));
          
          // If base currency changed, also update the old vault
          if (data.baseCurrencyId !== existing.baseCurrencyId) {
            const oldVaultUpdated = { ...oldVault, balance: revertedBalance, updatedAt: now };
            await accountVaultDB.update(oldVaultUpdated);
            setAccountVaults(accountVaults.map(av => av.id === oldVault.id ? oldVaultUpdated : av));
          }
        } else {
          // New transaction is DEFERRED, just keep reverted balance
          const updatedVault = { ...oldVault, balance: revertedBalance, updatedAt: now };
          await accountVaultDB.update(updatedVault);
          setAccountVaults(accountVaults.map(av => av.id === oldVault.id ? updatedVault : av));
        }
      }
    } else if (existing.paymentType !== 'CASH' && data.paymentType === 'CASH' && data.baseCurrencyId) {
      // Old was DEFERRED, new is CASH - apply the new transaction
      const accountVault = accountVaults.find(
        av => av.accountId === data.accountId && av.currencyId === data.baseCurrencyId
      );
      
      if (accountVault) {
        const newBalance = data.type === 'INCOME'
          ? accountVault.balance - data.amount
          : accountVault.balance + data.amount;
        
        const updatedVault = { ...accountVault, balance: newBalance, updatedAt: now };
        await accountVaultDB.update(updatedVault);
        setAccountVaults(accountVaults.map(av => av.id === accountVault.id ? updatedVault : av));
      }
    }

    const updated: Transaction = {
      ...existing,
      accountId: data.accountId,
      currencyId: data.currencyId,
      baseCurrencyId: data.baseCurrencyId || null,
      type: data.type,
      paymentType: data.paymentType,
      amount: data.amount,
      conversionFactor: data.conversionFactor,
      conversionMethod: data.conversionMethod,
      feesType: data.feesType,
      feesDirection: data.feesDirection,
      feesAmount: data.feesAmount,
      finalBalance,
      description: data.description || null,
      date: data.date,
      updatedAt: now,
      account: accounts.find(a => a.id === data.accountId),
      currency: currencies.find(c => c.id === data.currencyId),
      baseCurrency: data.baseCurrencyId ? currencies.find(c => c.id === data.baseCurrencyId) : null,
    };

    await transactionDB.update(updated);
    setTransactions(transactions.map(t => t.id === id ? updated : t));
    return updated;
  }, [transactions, setTransactions, currencies, accounts, accountVaults, setAccountVaults]);

  const deleteTransaction = useCallback(async (id: string) => {
    const existing = transactions.find(t => t.id === id);
    if (existing) {
      // Only revert vault balance if transaction was CASH
      if (existing.paymentType === 'CASH' && existing.baseCurrencyId) {
        const accountVault = accountVaults.find(
          av => av.accountId === existing.accountId && av.currencyId === existing.baseCurrencyId
        );
        
        if (accountVault) {
          // Revert the effect
          const newBalance = existing.type === 'INCOME'
            ? accountVault.balance + existing.amount
            : accountVault.balance - existing.amount;
          
          const updatedVault = { ...accountVault, balance: newBalance, updatedAt: new Date().toISOString() };
          await accountVaultDB.update(updatedVault);
          setAccountVaults(accountVaults.map(av => av.id === accountVault.id ? updatedVault : av));
        }
      }
    }

    await transactionDB.delete(id);
    setTransactions(transactions.filter(t => t.id !== id));
  }, [transactions, setTransactions, accountVaults, setAccountVaults]);

  return { transactions, addTransaction, updateTransaction, deleteTransaction };
}

// Debt operations
export function useDebts() {
  const { debts, setDebts, currencies, accounts } = useAppStore();

  const calculateFinalBalance = (data: DebtFormData): number => {
    let amount = data.amount;
    if (data.conversionMethod === 'MULTIPLY') {
      amount = amount * data.conversionFactor;
    } else {
      amount = amount / data.conversionFactor;
    }
    return Math.round(amount * 100) / 100;
  };

  const addDebt = useCallback(async (data: DebtFormData) => {
    const now = new Date().toISOString();
    const finalBalance = calculateFinalBalance(data);
    
    const debt: Debt = {
      id: generateId(),
      accountId: data.accountId,
      currencyId: data.currencyId,
      type: data.type,
      amount: data.amount,
      conversionFactor: data.conversionFactor,
      conversionMethod: data.conversionMethod,
      finalBalance,
      description: data.description || null,
      isPaid: false,
      paidAt: null,
      date: data.date,
      createdAt: now,
      updatedAt: now,
      account: accounts.find(a => a.id === data.accountId),
      currency: currencies.find(c => c.id === data.currencyId),
    };

    await debtDB.add(debt);
    setDebts([...debts, debt]);
    return debt;
  }, [debts, setDebts, currencies, accounts]);

  const updateDebt = useCallback(async (id: string, data: DebtFormData) => {
    const existing = debts.find(d => d.id === id);
    if (!existing) return null;

    const finalBalance = calculateFinalBalance(data);
    const now = new Date().toISOString();
    
    const updated: Debt = {
      ...existing,
      accountId: data.accountId,
      currencyId: data.currencyId,
      type: data.type,
      amount: data.amount,
      conversionFactor: data.conversionFactor,
      conversionMethod: data.conversionMethod,
      finalBalance,
      description: data.description || null,
      date: data.date,
      updatedAt: now,
      account: accounts.find(a => a.id === data.accountId),
      currency: currencies.find(c => c.id === data.currencyId),
    };

    await debtDB.update(updated);
    setDebts(debts.map(d => d.id === id ? updated : d));
    return updated;
  }, [debts, setDebts, currencies, accounts]);

  const markAsPaid = useCallback(async (id: string) => {
    const existing = debts.find(d => d.id === id);
    if (!existing) return null;

    const updated: Debt = {
      ...existing,
      isPaid: true,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await debtDB.update(updated);
    setDebts(debts.map(d => d.id === id ? updated : d));
    return updated;
  }, [debts, setDebts]);

  const deleteDebt = useCallback(async (id: string) => {
    await debtDB.delete(id);
    setDebts(debts.filter(d => d.id !== id));
  }, [debts, setDebts]);

  return { debts, addDebt, updateDebt, markAsPaid, deleteDebt };
}

// Vault operations (main system vaults)
export function useVaults() {
  const { vaults, setVaults } = useAppStore();

  const updateOpeningBalance = useCallback(async (vaultId: string, balance: number) => {
    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) return null;

    const updated = {
      ...vault,
      openingBalance: balance,
      balance: balance,
      updatedAt: new Date().toISOString(),
    };

    await vaultDB.update(updated);
    setVaults(vaults.map(v => v.id === vaultId ? updated : v));
    return updated;
  }, [vaults, setVaults]);

  return { vaults, updateOpeningBalance };
}

// Backup/Restore operations
export function useBackup() {
  const { loadData } = useSupabaseData();

  const backup = useCallback(async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sarafa-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const restore = useCallback(async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    await importData(data);
    await loadData();
  }, [loadData]);

  return { backup, restore };
}
