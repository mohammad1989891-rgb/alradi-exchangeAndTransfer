// ============ Currency & Exchange Types ============

export interface Currency {
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  flag: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  buyRate: number;
  sellRate: number;
  lastUpdated: string;
}

// ============ Transaction Types ============

export type TransactionType = 'exchange' | 'remittance' | 'deposit' | 'withdrawal';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  status: TransactionStatus;
  customerName?: string;
  recipientName?: string;
  notes?: string;
  createdAt: string;
}

// ============ Remittance Types ============

export type RemittanceStatus = 'pending' | 'completed' | 'cancelled';

export interface Remittance {
  id: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  amount: number;
  currency: string;
  fee: number;
  status: RemittanceStatus;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

// ============ Customer Types ============

export interface Customer {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  address?: string;
  notes?: string;
  totalTransactions: number;
  totalAmount: number;
  createdAt: string;
}

// ============ Dashboard Stats ============

export interface DashboardStats {
  todayTransactions: number;
  transferAmount: number;
  pendingTransactions: number;
  availableBalance: number;
}

// ============ Daily Chart Data ============

export interface DailyChartData {
  day: string;
  exchanges: number;
  remittances: number;
}

// ============ Filter Types ============

export interface HistoryFilter {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType | 'all';
  status?: TransactionStatus | 'all';
  currency?: string | 'all';
}
