import type {
  ExchangeRate,
  Transaction,
  Remittance,
  Customer,
  DashboardStats,
  DailyChartData,
  Currency,
} from './types';

// ============ Base API Helper ============

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return await response.json();
}

// ============ Static Data ============

export const CURRENCIES: Currency[] = [
  { code: 'SYP', nameAr: 'ليرة سورية', nameEn: 'Syrian Pound', symbol: 'ل.س', flag: '🇸🇾' },
  { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', nameAr: 'يورو', nameEn: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
  { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', symbol: 'د.أ', flag: '🇯🇴' },
  { code: 'LBP', nameAr: 'ليرة لبنانية', nameEn: 'Lebanese Pound', symbol: 'ل.ل', flag: '🇱🇧' },
];

// ============ Mock Data (fallback) ============

export const mockExchangeRates: ExchangeRate[] = [
  { id: '1', fromCurrency: 'USD', toCurrency: 'SYP', buyRate: 14500, sellRate: 14700, lastUpdated: new Date().toISOString() },
  { id: '2', fromCurrency: 'EUR', toCurrency: 'SYP', buyRate: 15700, sellRate: 15900, lastUpdated: new Date().toISOString() },
  { id: '3', fromCurrency: 'GBP', toCurrency: 'SYP', buyRate: 18300, sellRate: 18600, lastUpdated: new Date().toISOString() },
  { id: '4', fromCurrency: 'SAR', toCurrency: 'SYP', buyRate: 3860, sellRate: 3920, lastUpdated: new Date().toISOString() },
  { id: '5', fromCurrency: 'AED', toCurrency: 'SYP', buyRate: 3940, sellRate: 4000, lastUpdated: new Date().toISOString() },
  { id: '6', fromCurrency: 'TRY', toCurrency: 'SYP', buyRate: 400, sellRate: 415, lastUpdated: new Date().toISOString() },
  { id: '7', fromCurrency: 'JOD', toCurrency: 'SYP', buyRate: 20400, sellRate: 20700, lastUpdated: new Date().toISOString() },
  { id: '8', fromCurrency: 'LBP', toCurrency: 'SYP', buyRate: 0.16, sellRate: 0.18, lastUpdated: new Date().toISOString() },
  { id: '9', fromCurrency: 'USD', toCurrency: 'EUR', buyRate: 0.92, sellRate: 0.94, lastUpdated: new Date().toISOString() },
  { id: '10', fromCurrency: 'USD', toCurrency: 'GBP', buyRate: 0.79, sellRate: 0.81, lastUpdated: new Date().toISOString() },
  { id: '11', fromCurrency: 'USD', toCurrency: 'SAR', buyRate: 3.75, sellRate: 3.76, lastUpdated: new Date().toISOString() },
  { id: '12', fromCurrency: 'USD', toCurrency: 'AED', buyRate: 3.67, sellRate: 3.68, lastUpdated: new Date().toISOString() },
];

export const mockTransactions: Transaction[] = [
  { id: 'T001', type: 'exchange', fromCurrency: 'USD', toCurrency: 'SYP', fromAmount: 1000, toAmount: 14500000, rate: 14500, fee: 5000, status: 'completed', customerName: 'أحمد محمد', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'T002', type: 'remittance', fromCurrency: 'USD', toCurrency: 'USD', fromAmount: 500, toAmount: 500, rate: 1, fee: 10, status: 'pending', customerName: 'خالد علي', recipientName: 'سعاد علي', notes: 'حوالة عائلية', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'T003', type: 'exchange', fromCurrency: 'EUR', toCurrency: 'SYP', fromAmount: 500, toAmount: 7850000, rate: 15700, fee: 4000, status: 'completed', customerName: 'فاطمة حسن', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'T004', type: 'exchange', fromCurrency: 'SAR', toCurrency: 'SYP', fromAmount: 3000, toAmount: 11580000, rate: 3860, fee: 3000, status: 'completed', customerName: 'عمر يوسف', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'T005', type: 'remittance', fromCurrency: 'USD', toCurrency: 'USD', fromAmount: 2000, toAmount: 2000, rate: 1, fee: 15, status: 'cancelled', customerName: 'سارة أحمد', recipientName: 'محمد أحمد', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'T006', type: 'exchange', fromCurrency: 'GBP', toCurrency: 'SYP', fromAmount: 200, toAmount: 3660000, rate: 18300, fee: 2500, status: 'completed', customerName: 'نور الدين', createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 'T007', type: 'deposit', fromCurrency: 'USD', toCurrency: 'USD', fromAmount: 5000, toAmount: 5000, rate: 1, fee: 0, status: 'completed', customerName: 'ليلى كرم', createdAt: new Date(Date.now() - 25200000).toISOString() },
  { id: 'T008', type: 'exchange', fromCurrency: 'AED', toCurrency: 'SYP', fromAmount: 5000, toAmount: 19700000, rate: 3940, fee: 6000, status: 'completed', customerName: 'رامي العلي', createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: 'T009', type: 'remittance', fromCurrency: 'EUR', toCurrency: 'EUR', fromAmount: 1000, toAmount: 1000, rate: 1, fee: 12, status: 'pending', customerName: 'هدى سالم', recipientName: 'عبدالله سالم', createdAt: new Date(Date.now() - 32400000).toISOString() },
  { id: 'T010', type: 'exchange', fromCurrency: 'TRY', toCurrency: 'SYP', fromAmount: 10000, toAmount: 4000000, rate: 400, fee: 2000, status: 'completed', customerName: 'مريم الخطيب', createdAt: new Date(Date.now() - 36000000).toISOString() },
];

export const mockRemittances: Remittance[] = [
  { id: 'R001', senderName: 'خالد علي', recipientName: 'سعاد علي', recipientPhone: '+963-911-123-456', amount: 500, currency: 'USD', fee: 10, status: 'pending', notes: 'حوالة عائلية', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'R002', senderName: 'هدى سالم', recipientName: 'عبدالله سالم', recipientPhone: '+963-933-789-012', amount: 1000, currency: 'EUR', fee: 12, status: 'pending', notes: 'مساعدة شهرية', createdAt: new Date(Date.now() - 32400000).toISOString() },
  { id: 'R003', senderName: 'محمد خير', recipientName: 'آمنة خير', recipientPhone: '+963-944-345-678', amount: 300, currency: 'USD', fee: 8, status: 'completed', notes: '', createdAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 'R004', senderName: 'سارة أحمد', recipientName: 'محمد أحمد', recipientPhone: '+963-955-901-234', amount: 2000, currency: 'USD', fee: 15, status: 'cancelled', notes: 'تم الإلغاء بناءً على طلب المرسل', createdAt: new Date(Date.now() - 18000000).toISOString() },
];

export const mockCustomers: Customer[] = [
  { id: 'C001', name: 'أحمد محمد', phone: '+963-911-234-567', idNumber: '12345678', address: 'دمشق - المزة', notes: 'عميل VIP', totalTransactions: 45, totalAmount: 125000, createdAt: '2024-01-15T10:00:00Z' },
  { id: 'C002', name: 'خالد علي', phone: '+963-933-456-789', idNumber: '23456789', address: 'حلب - السليمانية', notes: '', totalTransactions: 23, totalAmount: 56000, createdAt: '2024-02-20T08:30:00Z' },
  { id: 'C003', name: 'فاطمة حسن', phone: '+963-944-567-890', idNumber: '34567890', address: 'حمص - الوعر', notes: 'تتعامل باليورو غالباً', totalTransactions: 18, totalAmount: 34000, createdAt: '2024-03-10T14:00:00Z' },
  { id: 'C004', name: 'عمر يوسف', phone: '+963-955-678-901', idNumber: '45678901', address: 'اللاذقية - الزراعة', notes: '', totalTransactions: 31, totalAmount: 89000, createdAt: '2024-01-05T09:15:00Z' },
  { id: 'C005', name: 'سارة أحمد', phone: '+963-966-789-012', idNumber: '56789012', address: 'طرطوس - المينا', notes: '', totalTransactions: 12, totalAmount: 22000, createdAt: '2024-04-01T11:45:00Z' },
  { id: 'C006', name: 'نور الدين', phone: '+963-977-890-123', idNumber: '67890123', address: 'دمشق - كفرسوسة', notes: 'عميل منتظم', totalTransactions: 56, totalAmount: 230000, createdAt: '2023-11-20T16:30:00Z' },
  { id: 'C007', name: 'ليلى كرم', phone: '+963-988-901-234', idNumber: '78901234', address: 'حماة - الحضارة', notes: '', totalTransactions: 8, totalAmount: 15000, createdAt: '2024-05-12T13:20:00Z' },
  { id: 'C008', name: 'رامي العلي', phone: '+963-999-012-345', idNumber: '89012345', address: 'دير الزور - القوسور', notes: '', totalTransactions: 15, totalAmount: 42000, createdAt: '2024-02-28T10:00:00Z' },
];

export const mockDashboardStats: DashboardStats = {
  todayTransactions: 24,
  transferAmount: 156500000,
  pendingTransactions: 3,
  availableBalance: 45000000,
};

export const mockChartData: DailyChartData[] = [
  { day: 'السبت', exchanges: 12, remittances: 5 },
  { day: 'الأحد', exchanges: 15, remittances: 8 },
  { day: 'الاثنين', exchanges: 20, remittances: 12 },
  { day: 'الثلاثاء', exchanges: 18, remittances: 6 },
  { day: 'الأربعاء', exchanges: 22, remittances: 10 },
  { day: 'الخميس', exchanges: 25, remittances: 14 },
  { day: 'الجمعة', exchanges: 8, remittances: 3 },
];

// ============ API Functions ============

export const api = {
  // Dashboard
  getStats: () => apiCall<DashboardStats>('/api/stats').catch(() => mockDashboardStats),
  getChartData: () => apiCall<DailyChartData[]>('/api/chart').catch(() => mockChartData),

  // Exchange Rates
  getExchangeRates: () => apiCall<ExchangeRate[]>('/api/exchange-rates').catch(() => mockExchangeRates),
  updateExchangeRate: (id: string, data: Partial<ExchangeRate>) =>
    apiCall<{ success: boolean }>(`/api/exchange-rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  addExchangeRate: (data: Omit<ExchangeRate, 'id' | 'lastUpdated'>) =>
    apiCall<{ success: boolean }>('/api/exchange-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Transactions
  getTransactions: () =>
    apiCall<{ transactions: Transaction[]; total: number }>('/api/transactions')
      .then((res) => res.transactions)
      .catch(() => mockTransactions),
  createTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) =>
    apiCall<{ success: boolean; id: string }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Remittances
  getRemittances: () => apiCall<Remittance[]>('/api/remittances').catch(() => mockRemittances),
  createRemittance: (data: Omit<Remittance, 'id' | 'createdAt' | 'completedAt'>) =>
    apiCall<{ success: boolean; id: string }>('/api/remittances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  completeRemittance: (id: string) =>
    apiCall<{ success: boolean }>(`/api/remittances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'complete' }),
    }),
  cancelRemittance: (id: string) =>
    apiCall<{ success: boolean }>(`/api/remittances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'cancel' }),
    }),

  // Customers
  getCustomers: () => apiCall<Customer[]>('/api/customers').catch(() => mockCustomers),
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'totalTransactions' | 'totalAmount'>) =>
    apiCall<{ success: boolean; id: string }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Seed
  seedDatabase: () =>
    apiCall<{ success: boolean; message: string }>('/api/seed', { method: 'POST' }),
};

// ============ Helper Functions ============

export function formatCurrency(amount: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.code === currency);
  if (!curr) return `${amount.toLocaleString('ar-SA')} ${currency}`;

  if (currency === 'SYP' || currency === 'LBP') {
    return `${amount.toLocaleString('ar-SA')} ${curr.symbol}`;
  }
  return `${curr.symbol}${amount.toLocaleString('ar-SA')}`;
}

export function getCurrencyName(code: string): string {
  const curr = CURRENCIES.find((c) => c.code === code);
  return curr ? `${curr.flag} ${curr.nameAr}` : code;
}

export function getCurrencySymbol(code: string): string {
  const curr = CURRENCIES.find((c) => c.code === code);
  return curr?.symbol || code;
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    exchange: 'تحويل عملات',
    remittance: 'حوالة',
    transfer: 'حوالة',
    deposit: 'إيداع',
    withdrawal: 'سحب',
  };
  return labels[type] || type;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'مكتمل',
    pending: 'معلق',
    cancelled: 'ملغى',
    failed: 'فاشل',
  };
  return labels[status] || status;
}

export function formatDateAr(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeAr(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTimeAr(dateStr: string): string {
  return `${formatDateAr(dateStr)} ${formatTimeAr(dateStr)}`;
}
