import { create } from 'zustand';
import type {
  ExchangeRate,
  Transaction,
  Remittance,
  Customer,
  DashboardStats,
  DailyChartData,
  HistoryFilter,
} from '@/lib/types';
import {
  mockExchangeRates,
  mockTransactions,
  mockRemittances,
  mockCustomers,
  mockDashboardStats,
  mockChartData,
  api,
} from '@/lib/api';

interface AppState {
  // Data
  exchangeRates: ExchangeRate[];
  transactions: Transaction[];
  remittances: Remittance[];
  customers: Customer[];
  stats: DashboardStats;
  chartData: DailyChartData[];

  // UI State
  activeTab: string;
  isLoading: boolean;
  isDataLoaded: boolean;
  historyFilter: HistoryFilter;
  searchQuery: string;

  // Actions
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setHistoryFilter: (filter: HistoryFilter) => void;
  setSearchQuery: (query: string) => void;
  loadData: () => Promise<void>;

  // Data Actions
  addExchangeRate: (rate: ExchangeRate) => void;
  updateExchangeRate: (id: string, data: Partial<ExchangeRate>) => void;
  addTransaction: (transaction: Transaction) => void;
  addRemittance: (remittance: Remittance) => void;
  completeRemittance: (id: string) => void;
  cancelRemittance: (id: string) => void;
  addCustomer: (customer: Customer) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial Data (mock)
  exchangeRates: mockExchangeRates,
  transactions: mockTransactions,
  remittances: mockRemittances,
  customers: mockCustomers,
  stats: mockDashboardStats,
  chartData: mockChartData,

  // UI State
  activeTab: 'dashboard',
  isLoading: false,
  isDataLoaded: false,
  historyFilter: { type: 'all', status: 'all', currency: 'all' },
  searchQuery: '',

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (loading) => set({ isLoading: loading }),
  setHistoryFilter: (filter) => set({ historyFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Load data from API
  loadData: async () => {
    if (get().isDataLoaded) return;
    set({ isLoading: true });
    try {
      const [stats, chartData, exchangeRates, transactions, remittances, customers] = await Promise.all([
        api.getStats(),
        api.getChartData(),
        api.getExchangeRates(),
        api.getTransactions(),
        api.getRemittances(),
        api.getCustomers(),
      ]);

      set({
        stats,
        chartData,
        exchangeRates,
        transactions: Array.isArray(transactions) ? transactions : [],
        remittances,
        customers,
        isDataLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Data Actions
  addExchangeRate: (rate) =>
    set((state) => ({ exchangeRates: [...state.exchangeRates, rate] })),

  updateExchangeRate: (id, data) =>
    set((state) => ({
      exchangeRates: state.exchangeRates.map((r) =>
        r.id === id ? { ...r, ...data, lastUpdated: new Date().toISOString() } : r
      ),
    })),

  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),

  addRemittance: (remittance) =>
    set((state) => ({ remittances: [remittance, ...state.remittances] })),

  completeRemittance: (id) =>
    set((state) => ({
      remittances: state.remittances.map((r) =>
        r.id === id
          ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString() }
          : r
      ),
    })),

  cancelRemittance: (id) =>
    set((state) => ({
      remittances: state.remittances.map((r) =>
        r.id === id ? { ...r, status: 'cancelled' as const } : r
      ),
    })),

  addCustomer: (customer) =>
    set((state) => ({ customers: [customer, ...state.customers] })),
}));
