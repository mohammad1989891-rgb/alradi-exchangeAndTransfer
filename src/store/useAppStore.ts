import { create } from 'zustand';
import type { Currency, Vault, Account, Transaction, Debt, CurrencyExchange, AccountVault } from '@/types';
import {
  getActiveCurrencies,
  getVaults,
  getAccounts,
  getTransactions,
  getDebts,
  getCurrencyExchanges,
  getTotalBalanceInUSD,
  getTotalDebtRemaining,
} from '@/lib/localDb';

type Tab = 'balances' | 'accounts' | 'transactions' | 'debts' | 'settings' | 'exchange' | 'vehicles';

interface AppState {
  // Navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  
  // Side Menu
  isSideMenuOpen: boolean;
  openSideMenu: () => void;
  closeSideMenu: () => void;
  
  // Data
  currencies: Currency[];
  vaults: Vault[];
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  currencyExchanges: CurrencyExchange[];
  accountVaults: AccountVault[];
  totalBalanceUSD: number;
  debtRemaining: {
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
  };
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isInitialized: boolean;
  setIsInitialized: (initialized: boolean) => void;
  
  // Setters
  setCurrencies: (currencies: Currency[]) => void;
  setVaults: (vaults: Vault[]) => void;
  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setDebts: (debts: Debt[]) => void;
  setCurrencyExchanges: (currencyExchanges: CurrencyExchange[]) => void;
  setAccountVaults: (accountVaults: AccountVault[]) => void;
  
  // Refresh all data from database
  refreshAllData: () => Promise<void>;
  
  // Modals
  isTransactionModalOpen: boolean;
  isDebtModalOpen: boolean;
  isAccountModalOpen: boolean;
  isVaultModalOpen: boolean;
  isCurrencyModalOpen: boolean;
  isAccountStatementOpen: boolean;
  isVaultQueryOpen: boolean;
  isOpeningBalanceModalOpen: boolean;
  isExchangeModalOpen: boolean;
  // Additional modals for compatibility
  isExchangeRateModalOpen: boolean;
  isExportImportModalOpen: boolean;
  editingTransaction: Transaction | null;
  editingDebt: Debt | null;
  editingAccount: Account | null;
  editingVault: Vault | null;
  editingCurrencyForExchangeRate: Currency | null;
  selectedAccountForStatement: Account | null;
  selectedVaultForQuery: Vault | null;
  
  // Modal actions
  openTransactionModal: (transaction?: Transaction) => void;
  closeTransactionModal: () => void;
  openDebtModal: (debt?: Debt) => void;
  closeDebtModal: () => void;
  openAccountModal: (account?: Account) => void;
  closeAccountModal: () => void;
  openVaultModal: () => void;
  closeVaultModal: () => void;
  openCurrencyModal: () => void;
  closeCurrencyModal: () => void;
  openAccountStatement: (account?: Account) => void;
  closeAccountStatement: () => void;
  openVaultQuery: (vault?: Vault) => void;
  closeVaultQuery: () => void;
  openOpeningBalanceModal: (vault?: Vault) => void;
  closeOpeningBalanceModal: () => void;
  openExchangeModal: () => void;
  closeExchangeModal: () => void;
  // Additional modal actions for compatibility
  openExchangeRateModal: (currency?: Currency) => void;
  closeExchangeRateModal: () => void;
  openExportImportModal: () => void;
  closeExportImportModal: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: 'balances',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // Side Menu
  isSideMenuOpen: false,
  openSideMenu: () => set({ isSideMenuOpen: true }),
  closeSideMenu: () => set({ isSideMenuOpen: false }),
  
  // Data
  currencies: [],
  vaults: [],
  accounts: [],
  transactions: [],
  debts: [],
  currencyExchanges: [],
  accountVaults: [],
  totalBalanceUSD: 0,
  debtRemaining: {
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
  },
  
  // Loading states
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
  isInitialized: false,
  setIsInitialized: (initialized) => set({ isInitialized: initialized }),
  
  // Setters
  setCurrencies: (currencies) => set({ currencies }),
  setVaults: (vaults) => set({ vaults }),
  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),
  setDebts: (debts) => set({ debts }),
  setCurrencyExchanges: (currencyExchanges) => set({ currencyExchanges }),
  setAccountVaults: (accountVaults) => set({ accountVaults }),
  
  // Refresh all data from database
  refreshAllData: async () => {
    try {
      const [currenciesData, vaultsData, accountsData, txData, debtData, exchangeData, totalUSD, debtRemainingData] = await Promise.all([
        getActiveCurrencies(),
        getVaults(),
        getAccounts(),
        getTransactions(),
        getDebts(),
        getCurrencyExchanges(),
        getTotalBalanceInUSD(),
        getTotalDebtRemaining(),
      ]);
      
      // ربط الحركات بالحسابات والعملات
      const enrichedTransactions = txData.map(t => ({
        ...t,
        account: accountsData.find(a => a.id === t.accountId),
        currency: currenciesData.find(c => c.id === t.currencyId),
        baseCurrency: currenciesData.find(c => c.id === t.baseCurrencyId),
      }));
      
      // ربط الديون بالحسابات والعملات
      const enrichedDebts = debtData.map(d => ({
        ...d,
        account: accountsData.find(a => a.id === d.accountId),
        currency: currenciesData.find(c => c.id === d.currencyId),
      }));
      
      set({
        currencies: currenciesData,
        vaults: vaultsData,
        accounts: accountsData,
        transactions: enrichedTransactions,
        debts: enrichedDebts,
        currencyExchanges: exchangeData,
        totalBalanceUSD: totalUSD,
        debtRemaining: debtRemainingData,
      });
      
      // إطلاق حدث تحديث البيانات
      window.dispatchEvent(new CustomEvent('app-data-refreshed'));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  },
  
  // Modals
  isTransactionModalOpen: false,
  isDebtModalOpen: false,
  isAccountModalOpen: false,
  isVaultModalOpen: false,
  isCurrencyModalOpen: false,
  isAccountStatementOpen: false,
  isVaultQueryOpen: false,
  isOpeningBalanceModalOpen: false,
  isExchangeModalOpen: false,
  // Additional modals for compatibility
  isExchangeRateModalOpen: false,
  isExportImportModalOpen: false,
  editingTransaction: null,
  editingDebt: null,
  editingAccount: null,
  editingVault: null,
  editingCurrencyForExchangeRate: null,
  selectedAccountForStatement: null,
  selectedVaultForQuery: null,
  
  // Modal actions
  openTransactionModal: (transaction) => set({ isTransactionModalOpen: true, editingTransaction: transaction || null }),
  closeTransactionModal: () => set({ isTransactionModalOpen: false, editingTransaction: null }),
  openDebtModal: (debt) => set({ isDebtModalOpen: true, editingDebt: debt || null }),
  closeDebtModal: () => set({ isDebtModalOpen: false, editingDebt: null }),
  openAccountModal: (account) => set({ isAccountModalOpen: true, editingAccount: account || null }),
  closeAccountModal: () => set({ isAccountModalOpen: false, editingAccount: null }),
  openVaultModal: () => set({ isVaultModalOpen: true }),
  closeVaultModal: () => set({ isVaultModalOpen: false }),
  openCurrencyModal: () => set({ isCurrencyModalOpen: true }),
  closeCurrencyModal: () => set({ isCurrencyModalOpen: false }),
  openAccountStatement: (account) => set({ isAccountStatementOpen: true, selectedAccountForStatement: account || null }),
  closeAccountStatement: () => set({ isAccountStatementOpen: false, selectedAccountForStatement: null }),
  openVaultQuery: (vault) => set({ isVaultQueryOpen: true, selectedVaultForQuery: vault || null }),
  closeVaultQuery: () => set({ isVaultQueryOpen: false, selectedVaultForQuery: null }),
  openOpeningBalanceModal: (vault) => set({ isOpeningBalanceModalOpen: true, editingVault: vault || null }),
  closeOpeningBalanceModal: () => set({ isOpeningBalanceModalOpen: false, editingVault: null }),
  openExchangeModal: () => set({ isExchangeModalOpen: true }),
  closeExchangeModal: () => set({ isExchangeModalOpen: false }),
  // Additional modal actions for compatibility
  openExchangeRateModal: (currency) => set({ isExchangeRateModalOpen: true, editingCurrencyForExchangeRate: currency || null }),
  closeExchangeRateModal: () => set({ isExchangeRateModalOpen: false, editingCurrencyForExchangeRate: null }),
  openExportImportModal: () => set({ isExportImportModalOpen: true }),
  closeExportImportModal: () => set({ isExportImportModalOpen: false }),
}));
