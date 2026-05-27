// Re-export types from localDb for consistency
export type { Currency, Vault, Account, Transaction, Debt, DebtPayment, CurrencyExchange, Exchange, ExportData } from '@/lib/localDb';

// AccountVault type for account-specific vaults
export interface AccountVault {
  id: string;
  accountId: string;
  currencyId: string;
  balance: number;
  openingBalance: number;
  isDefault: boolean;
  currency?: import('@/lib/localDb').Currency;
  account?: import('@/lib/localDb').Account;
  createdAt: string;
  updatedAt: string;
}

// Data Stats type
export interface DataStats {
  currencies: number;
  vaults: number;
  accounts: number;
  transactions: number;
  debts: number;
  debtPayments: number;
  currencyExchanges: number;
}

// API Response Types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Form Types
export type TransactionFormData = {
  accountId: string;
  currencyId: string;
  baseCurrencyId?: string | null;
  type: 'INCOME' | 'EXPENSE';
  paymentType: 'CASH' | 'DEFERRED';
  amount: number;
  conversionFactor: number;
  conversionMethod: 'MULTIPLY' | 'DIVIDE';
  feesType: 'FIXED' | 'PERCENTAGE' | 'PER_THOUSAND';
  feesDirection: 'INCOME' | 'EXPENSE';
  feesAmount: number;
  feesCurrencyId?: string;  // عملة الأجور
  description?: string;
  date: string | Date;
  isComplete?: boolean;
};

export type DebtFormData = {
  accountId: string;
  currencyId: string;
  amount: number;
  conversionFactor: number;
  conversionMethod: 'MULTIPLY' | 'DIVIDE';
  description?: string;
  date: string;
  debtType?: 'RECEIVABLE' | 'PAYABLE';  // نوع الدين: لنا أو علينا
  debtMode?: 'CASH' | 'DEFERRED';       // طريقة الدين: نقدي أو آجل
};

export type AccountFormData = {
  name: string;
  type: 'PRIVATE' | 'PUBLIC';
  description?: string;
};

export type VaultFormData = {
  currencyId: string;
  balance: number;
};

// Account Statement Types
export type AccountStatementItem = {
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'DEBT';
  description: string;
  amount: number;
  currency: string;
  balance: number;
  runningBalance: number;
};

import type { Account, Transaction, Debt } from '@/lib/localDb';

export type AccountStatementSummary = {
  account: Account;
  totalIncome: number;
  totalExpense: number;
  totalDebts: number;
  netBalance: number;
  transactions: (Transaction & { runningBalance?: number })[];
  debts: (Debt & { runningBalance?: number })[];
};
