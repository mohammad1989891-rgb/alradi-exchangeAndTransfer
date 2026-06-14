import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ============================================
// 🔸 Smart Retry System for Supabase Queries
// 🔸 Automatically retries on network/fetch errors
// 🔸 Skips retry on data/logic errors (validation, not found, etc.)
// 🔸 Exponential backoff: 500ms → 1000ms → 2000ms
// ============================================

/**
 * Determines if an error is retryable (network/fetch related).
 * Data/logic errors like "not found", "permission denied", or validation
 * errors are NOT retryable — retrying won't fix them.
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

  // Network / fetch errors — retryable
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('net::err_') ||
    msg.includes('fetch error') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('connection') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('load failed')
  ) {
    return true;
  }

  // TypeError in fetch context — usually network-related
  if (error instanceof TypeError && (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('load') ||
    msg.includes('failed')
  )) {
    return true;
  }

  // NOT retryable: table doesn't exist, RLS, validation, business logic
  if (
    msg.includes('could not find') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('relation') ||
    msg.includes('policy') ||
    msg.includes('permission') ||
    msg.includes('jwt') ||
    msg.includes('rls') ||
    msg.includes('violates') ||
    msg.includes('duplicate') ||
    msg.includes('unique') ||
    msg.includes('not null') ||
    msg.includes('foreign key') ||
    msg.includes('check constraint')
  ) {
    return false;
  }

  // For Supabase PostgrestError — check code
  const anyErr = error as Record<string, unknown>;
  const code = String(anyErr?.code || '');
  // Network-related Supabase error codes
  if (code === '08' || code.startsWith('08')) return true; // Connection exception
  if (code === '57' || code.startsWith('57')) return true; // Operator intervention

  // Default: retry unknown errors — they could be transient network issues
  // (Supabase PostgrestError objects are plain objects, not Error instances,
  // and may have empty messages like {}, so we retry them rather than crash)
  return true;
}

/**
 * Execute an async function with automatic retry on network errors.
 * Uses exponential backoff: 500ms → 1000ms → 2000ms.
 * Only retries on network/fetch errors — data/logic errors fail immediately.
 *
 * @param fn - The async function to execute
 * @param retries - Maximum number of retries (default: 3)
 * @param delay - Initial delay in ms, doubles on each retry (default: 500)
 * @returns The result of fn(), or null if all retries failed
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 500,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    // If the error is not retryable, log and return null instead of throwing
    // This prevents app crashes — callers use `return result || []` as fallback
    if (!isRetryableError(error)) {
      console.error('[Supabase] ❌ Non-retryable error (returning null):', error instanceof Error ? error.message : error);
      return null;
    }

    if (retries <= 0) {
      console.error('[Supabase] ❌ All retries exhausted:', error instanceof Error ? error.message : error);
      return null;
    }

    const attempt = 3 - retries + 1; // Human-readable attempt number
    console.warn(`[Supabase] ⚠️ Network error (attempt ${attempt}/3), retrying in ${delay}ms...`, error instanceof Error ? error.message : error);

    await new Promise(res => setTimeout(res, delay));

    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

// ============================================
// Types / Interfaces
// ============================================

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
  exchangeRate: number;
  conversionMethod?: 'MULTIPLY' | 'DIVIDE';
  createdAt: Date;
  updatedAt: Date;
}

export interface Vault {
  id: string;
  currencyId: string;
  balance: number;
  openingBalance: number;
  openingBalanceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currency?: Currency;
  conversionFactorToMain?: number;
}

export interface Account {
  id: string;
  name: string;
  type: 'PRIVATE' | 'PUBLIC';
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
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
  finalBalance: number;
  description?: string | null;
  date: Date;
  isOverflowTransaction?: boolean;
  relatedPaymentId?: string | null;
  isComplete: boolean;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
  account?: Account;
  currency?: Currency;
  baseCurrency?: Currency | null;
}

export interface Debt {
  id: string;
  accountId: string;
  currencyId: string;
  amount: number;
  conversionFactor: number;
  conversionMethod: 'MULTIPLY' | 'DIVIDE';
  finalBalance: number;
  description?: string | null;
  debtType: 'RECEIVABLE' | 'PAYABLE';
  debtMode: 'CASH' | 'DEFERRED';
  isPaid: boolean;
  isArchived?: boolean;
  paidAt?: Date | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  account?: Account;
  currency?: Currency;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  currencyId: string;
  description?: string | null;
  date: Date;
  paymentMode?: 'CASH' | 'DEFERRED';
  paymentDirection?: 'RECEIVABLE' | 'PAYABLE';
  overflowTransactionId?: string | null;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrencyExchange {
  id: string;
  outgoingCurrencyId: string;
  incomingCurrencyId: string;
  outgoingAmount: number;
  incomingAmount: number;
  outgoingRateAtTime: number;
  incomingRateAtTime: number;
  outgoingConversionMethod: 'MULTIPLY' | 'DIVIDE';
  incomingConversionMethod: 'MULTIPLY' | 'DIVIDE';
  outgoingUsd: number;
  incomingUsd: number;
  profit: number;
  description?: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  isArchived?: boolean;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  name: string;
  plateNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleTransaction {
  id: string;
  vehicleId: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedTransaction {
  id: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehiclesSettings {
  id: string;
  firstPartnerName: string;
  secondPartnerName: string;
  updatedAt: Date;
}

export interface CurrencyDebtSummary {
  currencyId: string;
  receivable: number;
  payable: number;
  receivablePaid: number;
  payablePaid: number;
  receivableRemaining: number;
  payableRemaining: number;
  netBalance: number;  // positive = لنا, negative = علينا
}

export interface AccountDebtSummary {
  accountId: string;
  account: Account | undefined;
  totalReceivable: number;
  totalPayable: number;
  totalReceivablePaid: number;
  totalPayablePaid: number;
  totalReceivableRemaining: number;
  totalPayableRemaining: number;
  finalBalance: number;
  debts: Debt[];
  payments: DebtPayment[];
  currencyBreakdown: CurrencyDebtSummary[];
}

export type Exchange = CurrencyExchange;

export interface ExportData {
  version: string;
  exportedAt: string;
  currencies: Currency[];
  vaults: Vault[];
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  currencyExchanges: CurrencyExchange[];
}

// ============================================
// Helper: camelCase ↔ snake_case conversion
// ============================================

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCaseKey(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase<T extends Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCaseKey(key)] = value;
  }
  return result as T;
}

function toSnakeCase<T extends Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[toSnakeCaseKey(key)] = value;
    }
  }
  return result as T;
}

// ============================================
// Helper: Date conversion
// ============================================

function isoToDate(value: string | null | undefined): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return new Date(value);
}

function dateToIso(value: Date | string | null | undefined): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

// Convert snake_case DB row to camelCase with Date objects
function rowToCurrency(row: Record<string, unknown>): Currency {
  const obj = toCamelCase<Currency>(row);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToVault(row: Record<string, unknown>): Vault {
  const obj = toCamelCase<Vault>(row);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  if (obj.openingBalanceDate) {
    obj.openingBalanceDate = new Date(obj.openingBalanceDate as unknown as string);
  }
  return obj;
}

function rowToAccount(row: Record<string, unknown>): Account {
  const obj = toCamelCase<Account>(row);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToTransaction(row: Record<string, unknown>): Transaction {
  const obj = toCamelCase<Transaction>(row);
  obj.date = new Date(obj.date as unknown as string);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToDebt(row: Record<string, unknown>): Debt {
  const obj = toCamelCase<Debt>(row);
  obj.date = new Date(obj.date as unknown as string);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  if (obj.paidAt) obj.paidAt = new Date(obj.paidAt as unknown as string);
  return obj;
}

function rowToDebtPayment(row: Record<string, unknown>): DebtPayment {
  const obj = toCamelCase<DebtPayment>(row);
  obj.date = new Date(obj.date as unknown as string);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToCurrencyExchange(row: Record<string, unknown>): CurrencyExchange {
  const obj = toCamelCase<CurrencyExchange>(row);
  obj.date = new Date(obj.date as unknown as string);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToUser(row: Record<string, unknown>): User {
  const obj = toCamelCase<User>(row);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  // Fallback: if role column doesn't exist yet, default to 'admin'
  if (!obj.role) {
    obj.role = 'admin';
  }
  return obj;
}

function rowToVehicle(row: Record<string, unknown>): Vehicle {
  const obj = toCamelCase<Vehicle>(row);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToVehicleTransaction(row: Record<string, unknown>): VehicleTransaction {
  const obj = toCamelCase<VehicleTransaction>(row);
  obj.date = new Date(obj.date as unknown as string);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToSharedTransaction(row: Record<string, unknown>): SharedTransaction {
  const obj = toCamelCase<SharedTransaction>(row);
  obj.date = new Date(obj.date as unknown as string);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

function rowToVehiclesSettings(row: Record<string, unknown>): VehiclesSettings {
  const obj = toCamelCase<VehiclesSettings>(row);
  obj.updatedAt = new Date(obj.updatedAt as unknown as string);
  return obj;
}

// Convert camelCase object to snake_case DB row with ISO dates
function currencyToRow(currency: Partial<Currency>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(currency as Record<string, unknown>);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function vaultToRow(vault: Partial<Vault>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(vault as Record<string, unknown>);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  if (row.opening_balance_date) row.opening_balance_date = dateToIso(row.opening_balance_date as Date);
  return row;
}

function accountToRow(account: Partial<Account>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(account as Record<string, unknown>);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function transactionToRow(transaction: Partial<Transaction>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(transaction as Record<string, unknown>);
  if (row.date) row.date = dateToIso(row.date as Date);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function debtToRow(debt: Partial<Debt>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(debt as Record<string, unknown>);
  if (row.date) row.date = dateToIso(row.date as Date);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  if (row.paid_at) row.paid_at = dateToIso(row.paid_at as Date);
  return row;
}

function debtPaymentToRow(payment: Partial<DebtPayment>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(payment as Record<string, unknown>);
  if (row.date) row.date = dateToIso(row.date as Date);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function currencyExchangeToRow(exchange: Partial<CurrencyExchange>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(exchange as Record<string, unknown>);
  if (row.date) row.date = dateToIso(row.date as Date);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function userToRow(user: Partial<User>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(user as Record<string, unknown>);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function vehicleToRow(vehicle: Partial<Vehicle>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(vehicle as Record<string, unknown>);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function vehicleTransactionToRow(vt: Partial<VehicleTransaction>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(vt as Record<string, unknown>);
  if (row.date) row.date = dateToIso(row.date as Date);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function sharedTransactionToRow(st: Partial<SharedTransaction>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(st as Record<string, unknown>);
  if (row.date) row.date = dateToIso(row.date as Date);
  if (row.created_at) row.created_at = dateToIso(row.created_at as Date);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

function vehiclesSettingsToRow(settings: Partial<VehiclesSettings>): Record<string, unknown> {
  const row = toSnakeCase<Record<string, unknown>>(settings as Record<string, unknown>);
  if (row.updated_at) row.updated_at = dateToIso(row.updated_at as Date);
  return row;
}

// ============================================
// Helper: clean undefined fields for Supabase
// ============================================

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================
// ID Generation
// ============================================

function generateId(): string {
  return 'sb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// calculateFinalBalance - COPIED VERBATIM
// ============================================

function calculateFinalBalance(
  amount: number,
  conversionFactor: number,
  conversionMethod: string,
  feesType: string,
  feesAmount: number,
  feesDirection: string,
  transactionType: 'INCOME' | 'EXPENSE' = 'INCOME'
): number {
  if (!conversionFactor || conversionFactor === 0) {
    return 0;
  }
  
  let finalBalance = amount;
  
  if (conversionMethod === 'MULTIPLY') {
    finalBalance = amount * conversionFactor;
  } else {
    finalBalance = amount / conversionFactor;
  }
  
  let feesValue = 0;
  if (feesAmount && feesAmount > 0) {
    switch (feesType) {
      case 'FIXED':
        feesValue = feesAmount;
        break;
      case 'PERCENTAGE':
        feesValue = (finalBalance * feesAmount) / 100;
        break;
      case 'PER_THOUSAND':
        feesValue = (finalBalance * feesAmount) / 1000;
        break;
    }
    
    const sameDirection = transactionType === feesDirection;
    
    if (sameDirection) {
      finalBalance = finalBalance + feesValue;
    } else {
      finalBalance = finalBalance - feesValue;
    }
  }
  
  return finalBalance;
}

// ============================================
// Default Currencies
// ============================================

const defaultCurrencies: Omit<Currency, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cur_usd', code: 'USD', name: 'دولار أمريكي', symbol: '$', isDefault: true, isActive: true, exchangeRate: 1, conversionMethod: 'MULTIPLY' },
  { id: 'cur_eur', code: 'EUR', name: 'يورو', symbol: '€', isDefault: false, isActive: false, exchangeRate: 1.08, conversionMethod: 'MULTIPLY' },
  { id: 'cur_gbp', code: 'GBP', name: 'جنيه إسترليني', symbol: '£', isDefault: false, isActive: false, exchangeRate: 1.27, conversionMethod: 'MULTIPLY' },
  { id: 'cur_sar', code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', isDefault: false, isActive: false, exchangeRate: 0.27, conversionMethod: 'DIVIDE' },
  { id: 'cur_aed', code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ', isDefault: false, isActive: false, exchangeRate: 0.27, conversionMethod: 'DIVIDE' },
  { id: 'cur_kwd', code: 'KWD', name: 'دينار كويتي', symbol: 'د.ك', isDefault: false, isActive: false, exchangeRate: 3.26, conversionMethod: 'MULTIPLY' },
  { id: 'cur_bhd', code: 'BHD', name: 'دينار بحريني', symbol: 'د.ب', isDefault: false, isActive: false, exchangeRate: 2.65, conversionMethod: 'MULTIPLY' },
  { id: 'cur_qar', code: 'QAR', name: 'ريال قطري', symbol: 'ر.ق', isDefault: false, isActive: false, exchangeRate: 0.27, conversionMethod: 'DIVIDE' },
  { id: 'cur_omr', code: 'OMR', name: 'ريال عماني', symbol: 'ر.ع', isDefault: false, isActive: false, exchangeRate: 2.60, conversionMethod: 'MULTIPLY' },
  { id: 'cur_syp', code: 'SYP', name: 'ليرة سورية', symbol: 'ل.س', isDefault: false, isActive: false, exchangeRate: 0.00004, conversionMethod: 'MULTIPLY' },
  { id: 'cur_lbp', code: 'LBP', name: 'ليرة لبنانية', symbol: 'ل.ل', isDefault: false, isActive: false, exchangeRate: 0.000011, conversionMethod: 'DIVIDE' },
  { id: 'cur_jod', code: 'JOD', name: 'دينار أردني', symbol: 'د.أ', isDefault: false, isActive: false, exchangeRate: 1.41, conversionMethod: 'MULTIPLY' },
  { id: 'cur_iqd', code: 'IQD', name: 'دينار عراقي', symbol: 'د.ع', isDefault: false, isActive: false, exchangeRate: 0.00076, conversionMethod: 'DIVIDE' },
  { id: 'cur_try', code: 'TRY', name: 'ليرة تركية', symbol: '₺', isDefault: false, isActive: false, exchangeRate: 0.031, conversionMethod: 'DIVIDE' },
  { id: 'cur_egp', code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م', isDefault: false, isActive: false, exchangeRate: 0.020, conversionMethod: 'DIVIDE' },
  { id: 'cur_tnd', code: 'TND', name: 'دينار تونسي', symbol: 'د.ت', isDefault: false, isActive: false, exchangeRate: 0.32, conversionMethod: 'MULTIPLY' },
  { id: 'cur_dzd', code: 'DZD', name: 'دينار جزائري', symbol: 'د.ج', isDefault: false, isActive: false, exchangeRate: 0.0075, conversionMethod: 'DIVIDE' },
  { id: 'cur_mad', code: 'MAD', name: 'درهم مغربي', symbol: 'د.م', isDefault: false, isActive: false, exchangeRate: 0.10, conversionMethod: 'DIVIDE' },
  { id: 'cur_inr', code: 'INR', name: 'روبية هندية', symbol: '₹', isDefault: false, isActive: false, exchangeRate: 0.012, conversionMethod: 'DIVIDE' },
  { id: 'cur_aud', code: 'AUD', name: 'دولار أسترالي', symbol: 'A$', isDefault: false, isActive: false, exchangeRate: 0.65, conversionMethod: 'MULTIPLY' },
  { id: 'cur_cad', code: 'CAD', name: 'دولار كندي', symbol: 'C$', isDefault: false, isActive: false, exchangeRate: 0.73, conversionMethod: 'MULTIPLY' },
  { id: 'cur_chf', code: 'CHF', name: 'فرنك سويسري', symbol: 'Fr', isDefault: false, isActive: false, exchangeRate: 1.12, conversionMethod: 'MULTIPLY' },
  { id: 'cur_cny', code: 'CNY', name: 'يوان صيني', symbol: '¥', isDefault: false, isActive: false, exchangeRate: 0.14, conversionMethod: 'DIVIDE' },
  { id: 'cur_jpy', code: 'JPY', name: 'ين ياباني', symbol: '¥', isDefault: false, isActive: false, exchangeRate: 0.0067, conversionMethod: 'DIVIDE' },
];

// ============================================
// Database Initialization
// ============================================

let isDbInitialized = false;

// Module-level flag: set to false when Supabase tables don't exist
export let tablesExist = true;

// Error type for missing tables — used by callers to distinguish from other errors
export const TABLES_MISSING_ERROR = 'TABLES_MISSING';

/**
 * Check whether Supabase tables exist by trying a simple SELECT
 * 🔸 Also checks if Supabase client is configured (isSupabaseConfigured)
 * 🔸 Distinguishes between "tables missing" vs "network/RLS error"
 * 🔸 Logs detailed info for debugging on different devices
 */
export async function checkTablesExist(): Promise<boolean> {
  // First check if Supabase is even configured
  if (!isSupabaseConfigured) {
    console.error('[Supabase] ❌ Client not configured — missing env vars');
    console.error('[Supabase] 💡 Check: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
    console.error('[Supabase] 💡 On Vercel: add in Settings → Environment Variables');
    tablesExist = false;
    return false;
  }

  try {
    console.log('[Supabase] 🔍 Checking if tables exist...');
    const result = await fetchWithRetry(async () => {
      const { data, error, status } = await supabase.from('currencies').select('id').limit(1);
      if (error) throw error;
      return { data, status };
    });

    if (result === null) {
      // All retries failed — likely network issue, assume tables exist and retry later
      console.warn('[Supabase] ⚠️ checkTablesExist: network error after retries, assuming tables exist');
      tablesExist = true;
      return true;
    }

    // Success — tables exist
    console.log('[Supabase] ✅ Tables exist, currencies count:', result.data?.length ?? 0);
    tablesExist = true;
    return true;
  } catch (err) {
    // fetchWithRetry re-throws non-retryable errors (e.g., table doesn't exist, RLS)
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    
    // Table doesn't exist
    if (
      msg.includes('could not find') ||
      msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('relation')
    ) {
      console.error('[Supabase] 💡 Tables do NOT exist. Run the migration SQL in Supabase SQL Editor.');
      tablesExist = false;
      return false;
    }

    // RLS or auth errors — tables exist but access denied
    if (msg.includes('policy') || msg.includes('permission') || msg.includes('jwt') || msg.includes('rls') || msg.includes('new row violates')) {
      console.error('[Supabase] ⚠️ Tables EXIST but RLS blocks access — FIX: Run fix-rls.sql in Supabase SQL Editor');
      tablesExist = true;
      return true;
    }

    // Other errors — don't block the app
    console.error('[Supabase] ❌ checkTablesExist exception:', err);
    tablesExist = true;
    return true;
  }
}

/**
 * إعادة تعيين حالة التهيئة
 * تُستخدم بعد إعداد قاعدة البيانات للسماح بإعادة التهيئة
 */
export function resetInitializationState(): void {
  isDbInitialized = false;
  tablesExist = true;
}

export async function initializeDatabase(): Promise<void> {
  if (isDbInitialized) return;

  console.log('[Supabase] 🔄 initializeDatabase() called...');

  // First check if tables exist
  const exist = await checkTablesExist();
  if (!exist) {
    // Don't throw — just set the flag and return silently
    // This allows the app to continue with empty data and show the setup screen
    console.warn('[Supabase] ⚠️ Tables do not exist. App will run with empty data.');
    isDbInitialized = true; // Mark as initialized so getters don't keep re-checking
    return;
  }
  
  const { data: currencies, error } = await supabase.from('currencies').select('id');
  if (error) {
    // Check if the error is because tables don't exist
    const msg = error.message || '';
    console.error('[Supabase] ❌ Error fetching currencies during init:', { message: msg, code: error.code, hint: error.hint });
    if (msg.includes('could not find') || msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('relation')) {
      tablesExist = false;
      // Don't throw — return silently so the app can show setup screen
      console.warn('[Supabase] ⚠️ Tables do not exist (detected during init). App will run with empty data.');
      isDbInitialized = true; // Mark as initialized so getters don't keep re-checking
      return;
    }
    // RLS error - log but don't crash
    if (msg.includes('policy') || msg.includes('permission') || msg.includes('violates row-level')) {
      console.error('[Supabase] ❌ RLS is blocking access! Run fix-rls.sql in Supabase SQL Editor to fix this.');
      isDbInitialized = true;
      return;
    }
    throw new Error(error.message);
  }
  
  const count = currencies?.length || 0;
  const hasUsd = currencies?.some(c => c.id === 'cur_usd');
  
  if (count === 0 || !hasUsd) {
    const now = new Date();
    
    // Delete old currencies
    await supabase.from('currencies').delete().neq('id', '__never_match__');
    
    // Insert default currencies
    const currencyRows = defaultCurrencies.map(c => 
      currencyToRow({ ...c, createdAt: now, updatedAt: now })
    );
    const { error: insertError } = await supabase.from('currencies').insert(currencyRows);
    if (insertError) throw new Error(insertError.message);
    
    // Check USD vault
    const { data: usdVaults } = await supabase.from('vaults').select('id').eq('currency_id', 'cur_usd');
    if (!usdVaults || usdVaults.length === 0) {
      const vaultRow = vaultToRow({
        id: 'vault_cur_usd',
        currencyId: 'cur_usd',
        balance: 0,
        openingBalance: 0,
        createdAt: now,
        updatedAt: now,
      });
      await supabase.from('vaults').insert([vaultRow]);
    }
    
    // Check default account
    const { data: accounts } = await supabase.from('accounts').select('id');
    if (!accounts || accounts.length === 0) {
      const accountRow = accountToRow({
        id: 'acc_sample',
        name: 'حساب رئيسي',
        type: 'PRIVATE',
        description: 'الحساب الافتراضي',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      await supabase.from('accounts').insert([accountRow]);
    }
  }
  
  // SYP migration fix
  try {
    const { data: sypCurrency } = await supabase.from('currencies').select('*').eq('id', 'cur_syp').single();
    if (sypCurrency) {
      const syp = rowToCurrency(sypCurrency);
      if (syp.conversionMethod === 'DIVIDE' && syp.exchangeRate < 1) {
        await supabase.from('currencies').update({
          conversion_method: 'MULTIPLY',
          updated_at: new Date().toISOString(),
        }).eq('id', 'cur_syp');
      }
    }
  } catch (e) {
    console.warn('SYP migration fix skipped:', e);
  }
  
  isDbInitialized = true;
}

// ============================================
// Reset Currencies to Default
// ============================================

export async function resetCurrenciesToDefault(): Promise<{ success: boolean; message: string }> {
  try {
    const now = new Date();
    
    // Delete all existing currencies
    await supabase.from('currencies').delete().neq('id', '__never_match__');
    
    // Re-insert default currencies
    const currencyRows = defaultCurrencies.map(c =>
      currencyToRow({ ...c, createdAt: now, updatedAt: now })
    );
    const { error } = await supabase.from('currencies').insert(currencyRows);
    if (error) throw new Error(error.message);
    
    // Ensure USD vault exists
    const { data: usdVaults } = await supabase.from('vaults').select('id').eq('currency_id', 'cur_usd');
    if (!usdVaults || usdVaults.length === 0) {
      const vaultRow = vaultToRow({
        id: 'vault_cur_usd',
        currencyId: 'cur_usd',
        balance: 0,
        openingBalance: 0,
        createdAt: now,
        updatedAt: now,
      });
      await supabase.from('vaults').insert([vaultRow]);
    }
    
    return { success: true, message: 'تم إعادة العملات الافتراضية بنجاح' };
  } catch (error) {
    console.error('Error resetting currencies:', error);
    return { success: false, message: 'حدث خطأ أثناء إعادة التعيين' };
  }
}

// ============================================
// Currency Functions
// ============================================

export async function getAllAvailableCurrencies(): Promise<Currency[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('currencies').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getAllAvailableCurrencies: failed after retries, returning []');
    return [];
  }
  console.log('[Supabase] 📊 Currencies loaded:', result?.length ?? 0);
  return (result || []).map(rowToCurrency);
}

export async function getActiveCurrencies(): Promise<Currency[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('currencies').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getActiveCurrencies: failed after retries, returning []');
    return [];
  }
  const active = (result || []).map(rowToCurrency).filter(c => c.isActive);
  console.log('[Supabase] 📊 Active currencies:', active.length);
  return active;
}

export async function activateCurrency(currencyId: string, exchangeRate?: number): Promise<Currency> {
  await initializeDatabase();
  
  const { data: currencyRow, error: fetchError } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (fetchError || !currencyRow) throw new Error('العملة غير موجودة');
  
  const currency = rowToCurrency(currencyRow);
  const now = new Date();
  const rate = exchangeRate ?? currency.exchangeRate ?? 1;
  
  const { error: updateError } = await supabase.from('currencies').update({
    is_active: true,
    exchange_rate: rate,
    updated_at: now.toISOString(),
  }).eq('id', currencyId);
  if (updateError) throw new Error(updateError.message);
  
  // Check if vault exists
  const { data: existingVaults } = await supabase.from('vaults').select('id').eq('currency_id', currencyId);
  if (!existingVaults || existingVaults.length === 0) {
    const vaultRow = vaultToRow({
      id: 'vault_' + currencyId,
      currencyId,
      balance: 0,
      openingBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
    await supabase.from('vaults').insert([vaultRow]);
  }
  
  const { data: updatedRow, error: refetchError } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToCurrency(updatedRow);
}

export async function deactivateCurrency(currencyId: string): Promise<void> {
  await initializeDatabase();
  
  const { data: currencyRow } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (currencyRow) {
    const currency = rowToCurrency(currencyRow);
    if (currency.isDefault) throw new Error('لا يمكن إلغاء تفعيل العملة الافتراضية');
  }
  
  const { error } = await supabase.from('currencies').update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq('id', currencyId);
  if (error) throw new Error(error.message);
}

export async function updateCurrencyExchangeRate(currencyId: string, rate: number): Promise<Currency> {
  await initializeDatabase();
  const { error } = await supabase.from('currencies').update({
    exchange_rate: rate,
    updated_at: new Date().toISOString(),
  }).eq('id', currencyId);
  if (error) throw new Error(error.message);
  
  const { data, error: refetchError } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToCurrency(data);
}

export async function updateCurrencyConversionMethod(currencyId: string, method: 'MULTIPLY' | 'DIVIDE'): Promise<Currency> {
  await initializeDatabase();
  const { error } = await supabase.from('currencies').update({
    conversion_method: method,
    updated_at: new Date().toISOString(),
  }).eq('id', currencyId);
  if (error) throw new Error(error.message);
  
  const { data, error: refetchError } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToCurrency(data);
}

export async function addCustomCurrency(data: { code: string; name: string; symbol: string; exchangeRate?: number; conversionMethod?: 'MULTIPLY' | 'DIVIDE' }): Promise<Currency> {
  await initializeDatabase();
  
  // Check for existing currency with same code
  const { data: existing } = await supabase.from('currencies').select('id').eq('code', data.code.toUpperCase());
  if (existing && existing.length > 0) {
    throw new Error('العملة موجودة بالفعل');
  }
  
  const now = new Date();
  const id = 'cur_custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  
  const currency: Currency = {
    id,
    code: data.code.toUpperCase(),
    name: data.name,
    symbol: data.symbol,
    isDefault: false,
    isActive: true,
    exchangeRate: data.exchangeRate || 1,
    conversionMethod: data.conversionMethod || 'MULTIPLY',
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('currencies').insert([currencyToRow(currency)]);
  if (error) throw new Error(error.message);
  
  // Create vault for new currency
  const { data: existingVaults } = await supabase.from('vaults').select('id').eq('currency_id', id);
  if (!existingVaults || existingVaults.length === 0) {
    const vaultRow = vaultToRow({
      id: 'vault_' + id,
      currencyId: id,
      balance: 0,
      openingBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
    await supabase.from('vaults').insert([vaultRow]);
  }
  
  return currency;
}

export async function deleteCurrencyFromDb(currencyId: string): Promise<void> {
  await initializeDatabase();
  
  const { data: currencyRow } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (!currencyRow) throw new Error('العملة غير موجودة');
  
  const currency = rowToCurrency(currencyRow);
  if (currency.isDefault) throw new Error('لا يمكن حذف العملة الافتراضية');
  
  // Check for related transactions
  const { count: txCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('currency_id', currencyId);
  const { count: debtCount } = await supabase.from('debts').select('id', { count: 'exact', head: true }).eq('currency_id', currencyId);
  
  // Check for related exchanges (non-deleted)
  const { data: exchangeData } = await supabase.from('currency_exchanges').select('id, outgoing_currency_id, incoming_currency_id, is_deleted')
    .or(`outgoing_currency_id.eq.${currencyId},incoming_currency_id.eq.${currencyId}`);
  const relatedExchanges = (exchangeData || []).filter(e => !e.is_deleted);
  
  if ((txCount || 0) > 0 || (debtCount || 0) > 0 || relatedExchanges.length > 0) {
    throw new Error('لا يمكن حذف عملة مرتبطة بحركات أو ديون أو عمليات صرف');
  }
  
  // Delete associated vault
  const { data: vaultRows } = await supabase.from('vaults').select('id').eq('currency_id', currencyId);
  if (vaultRows && vaultRows.length > 0) {
    for (const v of vaultRows) {
      await supabase.from('vaults').delete().eq('id', v.id);
    }
  }
  
  // Delete currency
  const { error } = await supabase.from('currencies').delete().eq('id', currencyId);
  if (error) throw new Error(error.message);
}

// ============================================
// Vault Functions
// ============================================

export async function getVaults(): Promise<Vault[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('vaults').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getVaults: failed after retries, returning []');
    return [];
  }
  console.log('[Supabase] 📊 Vaults loaded:', result?.length ?? 0);
  return (result || []).map(rowToVault);
}

/**
 * Recalculate vault balance from opening_balance + all vault-affecting operations after opening_balance_date
 * Formula: balance = opening_balance + sum(post-date operations)
 *
 * Operations that affect vault:
 * 1. TRANSACTIONS: Complete, cash, not archived
 * 2. DEBTS: Cash mode debts
 * 3. DEBT PAYMENTS: Cash mode payments
 * 4. CURRENCY EXCHANGES: Not deleted
 */
export async function recalculateVaultBalance(currencyId: string): Promise<Vault | null> {
  await initializeDatabase();

  // Get the vault
  const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', currencyId);
  if (!vaultRows || vaultRows.length === 0) return null;
  const vault = rowToVault(vaultRows[0]);

  const openingBalance = vault.openingBalance || 0;
  const openingDate = vault.openingBalanceDate;

  let delta = 0;

  // Build date filter - only operations AFTER opening_balance_date
  const dateFilter = openingDate ? openingDate.toISOString() : null;

  // 1. TRANSACTIONS: Complete, cash (overflow transactions use currencyId directly)
  let transactionQuery = supabase.from('transactions').select('*')
    .eq('is_complete', true)
    .eq('payment_type', 'CASH');

  if (dateFilter) {
    transactionQuery = transactionQuery.gt('date', dateFilter);
  }

  const { data: transactions } = await transactionQuery;
  if (transactions) {
    for (const tx of transactions) {
      const txObj = rowToTransaction(tx);
      // Determine which vault this transaction affects
      const vaultCurrencyId = txObj.isOverflowTransaction ? txObj.currencyId : (txObj.baseCurrencyId || txObj.currencyId);

      if (vaultCurrencyId === currencyId) {
        // INCOME: vault decreases (money goes out)
        // EXPENSE: vault increases (money comes in)
        if (txObj.type === 'INCOME') {
          delta -= txObj.amount;
        } else {
          delta += txObj.amount;
        }
      }
    }
  }

  // 2. DEBTS: Cash mode debts affect vault
  let debtQuery = supabase.from('debts').select('*')
    .eq('debt_mode', 'CASH');

  if (dateFilter) {
    debtQuery = debtQuery.gt('date', dateFilter);
  }

  const { data: debts } = await debtQuery;
  if (debts) {
    for (const d of debts) {
      const debtObj = rowToDebt(d);
      if (debtObj.currencyId === currencyId) {
        // PAYABLE (علينا): vault increases (we receive money)
        // RECEIVABLE (لنا): vault decreases (we give money out)
        if (debtObj.debtType === 'PAYABLE') {
          delta += debtObj.amount;
        } else {
          delta -= debtObj.amount;
        }
      }
    }
  }

  // 3. DEBT PAYMENTS: Cash mode
  let paymentQuery = supabase.from('debt_payments').select('*')
    .eq('payment_mode', 'CASH');

  if (dateFilter) {
    paymentQuery = paymentQuery.gt('date', dateFilter);
  }

  const { data: payments } = await paymentQuery;
  if (payments) {
    for (const p of payments) {
      const paymentObj = rowToDebtPayment(p);
      if (paymentObj.currencyId === currencyId) {
        // Debt payment direction logic:
        // RECEIVABLE (لنا): vault decreases (money goes out to pay toward our receivable)
        // PAYABLE (علينا): vault increases (money comes in to pay toward our payable)
        const direction = paymentObj.paymentDirection || 'RECEIVABLE';
        if (direction === 'PAYABLE') {
          delta += paymentObj.amount;
        } else {
          delta -= paymentObj.amount;
        }
      }
    }
  }

  // 4. CURRENCY EXCHANGES: Not deleted
  let exchangeQuery = supabase.from('currency_exchanges').select('*')
    .eq('is_deleted', false);

  if (dateFilter) {
    exchangeQuery = exchangeQuery.gt('date', dateFilter);
  }

  const { data: exchanges } = await exchangeQuery;
  if (exchanges) {
    for (const ex of exchanges) {
      const exchangeObj = rowToCurrencyExchange(ex);
      // Outgoing: vault decreases
      if (exchangeObj.outgoingCurrencyId === currencyId) {
        delta -= exchangeObj.outgoingAmount;
      }
      // Incoming: vault increases
      if (exchangeObj.incomingCurrencyId === currencyId) {
        delta += exchangeObj.incomingAmount;
      }
    }
  }

  // Compute new balance
  const newBalance = openingBalance + delta;

  // Update vault
  const { error } = await supabase.from('vaults').update({
    balance: newBalance,
    updated_at: new Date().toISOString(),
  }).eq('id', vault.id);

  if (error) throw new Error(error.message);

  const { data: updatedRow } = await supabase.from('vaults').select('*').eq('id', vault.id).single();
  return updatedRow ? rowToVault(updatedRow) : null;
}

export async function updateVaultBalance(_currencyId: string, _balanceDelta: number): Promise<Vault | null> {
  // Deprecated: Balance is now computed from opening_balance + post-date operations
  // Just recalculate
  return await recalculateVaultBalance(_currencyId);
}

export async function updateVaultOpeningBalance(
  currencyId: string,
  openingBalance: number,
  openingBalanceDate?: Date | null
): Promise<Vault | null> {
  await initializeDatabase();

  const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', currencyId);
  if (vaultRows && vaultRows.length > 0) {
    const vault = rowToVault(vaultRows[0]);

    const updateData: Record<string, unknown> = {
      opening_balance: openingBalance,
      updated_at: new Date().toISOString(),
    };

    if (openingBalanceDate !== undefined) {
      updateData.opening_balance_date = openingBalanceDate ? openingBalanceDate.toISOString() : null;
    }

    const { error } = await supabase.from('vaults').update(updateData).eq('id', vault.id);
    if (error) throw new Error(error.message);

    // Recalculate balance using the new opening balance + post-date operations
    return await recalculateVaultBalance(currencyId);
  }
  return null;
}

export async function getTotalBalanceInUSD(): Promise<number> {
  await initializeDatabase();
  if (!tablesExist) return 0;
  const allVaults = await getVaults();
  const allCurrencies = await getAllAvailableCurrencies();
  
  let total = 0;
  for (const vault of allVaults) {
    const currency = allCurrencies.find(c => c.id === vault.currencyId);
    if (currency && currency.isActive) {
      if (currency.conversionMethod === 'DIVIDE') {
        total += vault.balance / currency.exchangeRate;
      } else {
        total += vault.balance * currency.exchangeRate;
      }
    }
  }
  return total;
}

// ============================================
// Account Functions
// ============================================

export async function getAccounts(): Promise<Account[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('accounts').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getAccounts: failed after retries, returning []');
    return [];
  }
  const active = (result || []).map(rowToAccount).filter(a => a.isActive);
  console.log('[Supabase] 📊 Active accounts loaded:', active.length);
  return active;
}

export async function addAccount(data: Partial<Account>): Promise<Account> {
  await initializeDatabase();
  const now = new Date();
  const account: Account = {
    id: generateId(),
    name: data.name || '',
    type: data.type || 'PRIVATE',
    description: data.description,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from('accounts').insert([accountToRow(account)]);
  if (error) throw new Error(error.message);
  return account;
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account> {
  await initializeDatabase();
  const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const { error } = await supabase.from('accounts').update(accountToRow(updateFields as Partial<Account>)).eq('id', id);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow, error: refetchError } = await supabase.from('accounts').select('*').eq('id', id).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToAccount(updatedRow);
}

export async function deleteAccount(id: string): Promise<void> {
  await initializeDatabase();
  const { error } = await supabase.from('accounts').update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================
// Transaction Functions
// ============================================

export async function getTransactions(options?: { includeArchived?: boolean }): Promise<Transaction[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const includeArchived = options?.includeArchived ?? false;
  const result = await fetchWithRetry(async () => {
    let query = supabase.from('transactions').select('*').order('date', { ascending: false });
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getTransactions: failed after retries, returning []');
    return [];
  }
  console.log('[Supabase] 📊 Transactions loaded:', result?.length ?? 0, includeArchived ? '(incl. archived)' : '(active only)');
  return (result || []).map(rowToTransaction);
}

export async function addTransaction(data: {
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
  description?: string;
  date: string;
  isOverflowTransaction?: boolean;
  relatedPaymentId?: string | null;
  isComplete?: boolean;
  finalBalance?: number;  // 🔸 تجاوز الرصيد النهائي المحسوب
}): Promise<Transaction> {
  await initializeDatabase();
  const now = new Date();
  
  const effectiveFactor = data.conversionFactor ?? 1;
  // 🔸 إذا تم تمرير finalBalance يدويًا، نستخدمه مباشرة (للحركات غير المكتملة)
  const calculatedFinal = calculateFinalBalance(
    data.amount || 0,
    effectiveFactor,
    data.conversionMethod || 'MULTIPLY',
    data.feesType || 'FIXED',
    data.feesAmount || 0,
    data.feesDirection || 'INCOME',
    data.type
  );
  const finalBalance = data.finalBalance !== undefined ? data.finalBalance : calculatedFinal;
  
  // 🔸 Check Box هو المصدر الوحيد لحالة الاكتمال
  const isComplete = data.isComplete !== undefined ? data.isComplete : true;
  
  // Check balance for complete cash income transactions
  if (isComplete && data.paymentType === 'CASH' && data.type === 'INCOME') {
    const vaultCurrencyId = data.baseCurrencyId || data.currencyId;
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', vaultCurrencyId);
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      if (vault.balance - data.amount < 0) {
        const { data: currencyRow } = await supabase.from('currencies').select('*').eq('id', vaultCurrencyId).single();
        const currency = currencyRow ? rowToCurrency(currencyRow) : null;
        throw new Error(`الرصيد غير كافٍ في صندوق ${currency?.name || ''}`);
      }
    }
  }
  
  const transaction: Transaction = {
    id: generateId(),
    accountId: data.accountId,
    currencyId: data.currencyId,
    baseCurrencyId: data.baseCurrencyId || null,
    type: data.type,
    paymentType: data.paymentType,
    amount: data.amount,
    conversionFactor: effectiveFactor,
    conversionMethod: data.conversionMethod || 'MULTIPLY',
    feesType: data.feesType || 'FIXED',
    feesDirection: data.feesDirection || 'INCOME',
    feesAmount: data.feesAmount || 0,
    finalBalance,
    description: data.description,
    date: new Date(data.date),
    isOverflowTransaction: data.isOverflowTransaction || false,
    relatedPaymentId: data.relatedPaymentId || null,
    isComplete,
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('transactions').insert([transactionToRow(transaction)]);
  if (error) throw new Error(error.message);
  
  // Recalculate vault balance for complete cash transactions
  if (isComplete && data.paymentType === 'CASH') {
    const vaultCurrencyId = data.isOverflowTransaction ? data.currencyId : (data.baseCurrencyId || data.currencyId);
    await recalculateVaultBalance(vaultCurrencyId);
  }
  
  return transaction;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
  await initializeDatabase();
  
  const { data: oldRow, error: fetchError } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (fetchError || !oldRow) throw new Error('الحركة غير موجودة');
  
  const old = rowToTransaction(oldRow);
  const now = new Date();
  const oldIsComplete = old.isComplete !== undefined ? old.isComplete : true;
  
  const effectiveAmount = data.amount ?? old.amount;
  const effectiveConversionFactor = data.conversionFactor ?? old.conversionFactor;
  const effectiveConversionMethod = data.conversionMethod ?? old.conversionMethod;
  const effectiveFeesType = data.feesType ?? old.feesType;
  const effectiveFeesAmount = data.feesAmount ?? old.feesAmount;
  const effectiveFeesDirection = data.feesDirection ?? old.feesDirection;
  const effectiveType = data.type ?? old.type;
  const effectivePaymentType = data.paymentType ?? old.paymentType;
  
  // 🔸 إذا تم تمرير finalBalance يدويًا، نستخدمه مباشرة (للحركات غير المكتملة)
  const calculatedFinal = calculateFinalBalance(
    effectiveAmount,
    effectiveConversionFactor,
    effectiveConversionMethod,
    effectiveFeesType,
    effectiveFeesAmount,
    effectiveFeesDirection,
    effectiveType
  );
  const finalBalance = data.finalBalance !== undefined ? data.finalBalance : calculatedFinal;
  
  // 🔸 Check Box هو المصدر الوحيد لحالة الاكتمال
  const newIsComplete = data.isComplete !== undefined ? data.isComplete : true;
  
  // Clean data - remove undefined fields
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  
  const updateObj: Record<string, unknown> = {
    ...cleanData,
    finalBalance,
    isComplete: newIsComplete,
    date: data.date ? new Date(data.date) : old.date,
    updatedAt: now,
  };
  
  const { error: updateError } = await supabase.from('transactions').update(
    transactionToRow(updateObj as Partial<Transaction>)
  ).eq('id', id);
  if (updateError) throw new Error(updateError.message);

  // Recalculate vault balance for affected currencies
  const affectedCurrencyIds = new Set<string>();
  if (oldIsComplete && old.paymentType === 'CASH') {
    const oldVaultCurrencyId = old.isOverflowTransaction ? old.currencyId : (old.baseCurrencyId || old.currencyId);
    affectedCurrencyIds.add(oldVaultCurrencyId);
  }
  if (newIsComplete && effectivePaymentType === 'CASH') {
    const newVaultCurrencyId = (data.isOverflowTransaction ? data.currencyId : (data.baseCurrencyId ?? data.currencyId)) ?? (old.isOverflowTransaction ? old.currencyId : (old.baseCurrencyId || old.currencyId));
    affectedCurrencyIds.add(newVaultCurrencyId);
  }
  for (const cid of affectedCurrencyIds) {
    await recalculateVaultBalance(cid);
  }
  
  const { data: updatedRow, error: refetchError } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToTransaction(updatedRow);
}

export async function deleteTransaction(id: string): Promise<void> {
  await initializeDatabase();
  
  const { data: txRow, error: fetchError } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (fetchError || !txRow) throw new Error('الحركة غير موجودة');
  
  const transaction = rowToTransaction(txRow);
  
  // Determine vault currency ID for recalculation
  const vaultCurrencyId = transaction.isOverflowTransaction
    ? transaction.currencyId
    : (transaction.baseCurrencyId || transaction.currencyId);
  
  // If overflow transaction linked to a payment, remove the reference
  if (transaction.isOverflowTransaction && transaction.relatedPaymentId) {
    const { data: paymentRow } = await supabase.from('debt_payments').select('*').eq('id', transaction.relatedPaymentId).single();
    if (paymentRow) {
      const payment = rowToDebtPayment(paymentRow);
      if (payment.overflowTransactionId === id) {
        await supabase.from('debt_payments').update({
          overflow_transaction_id: null,
          updated_at: new Date().toISOString(),
        }).eq('id', payment.id);
      }
    }
  }
  
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  
  // Recalculate vault balance after deletion
  if ((transaction.isComplete !== false) && transaction.paymentType === 'CASH') {
    await recalculateVaultBalance(vaultCurrencyId);
  }
}

// ============================================
// Debt Functions
// ============================================

export async function getDebts(options?: { includeArchived?: boolean }): Promise<Debt[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const includeArchived = options?.includeArchived ?? false;
  const result = await fetchWithRetry(async () => {
    let query = supabase.from('debts').select('*').order('date', { ascending: false });
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getDebts: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToDebt);
}

export async function addDebt(data: {
  accountId: string;
  currencyId: string;
  amount: number;
  conversionFactor: number;
  conversionMethod: 'MULTIPLY' | 'DIVIDE';
  description?: string;
  date: string;
  debtType?: 'RECEIVABLE' | 'PAYABLE';
  debtMode?: 'CASH' | 'DEFERRED';
}): Promise<Debt> {
  await initializeDatabase();
  const now = new Date();
  const finalBalance = data.conversionMethod === 'MULTIPLY'
    ? data.amount * (data.conversionFactor || 1)
    : data.amount / (data.conversionFactor || 1);
  
  const debtMode = data.debtMode || 'DEFERRED';
  const debtType = data.debtType || 'RECEIVABLE';
  
  const debt: Debt = {
    id: generateId(),
    accountId: data.accountId,
    currencyId: data.currencyId,
    amount: data.amount,
    conversionFactor: data.conversionFactor || 1,
    conversionMethod: data.conversionMethod,
    finalBalance,
    description: data.description,
    debtType: debtType,
    debtMode: debtMode,
    isPaid: false,
    date: new Date(data.date),
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('debts').insert([debtToRow(debt)]);
  if (error) throw new Error(error.message);
  
  // Recalculate vault balance for CASH debts
  if (debtMode === 'CASH') {
    await recalculateVaultBalance(data.currencyId);
  }
  
  return debt;
}

export async function updateDebt(id: string, data: Partial<Debt>): Promise<Debt> {
  await initializeDatabase();
  const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const { error } = await supabase.from('debts').update(debtToRow(updateFields as Partial<Debt>)).eq('id', id);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow, error: refetchError } = await supabase.from('debts').select('*').eq('id', id).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToDebt(updatedRow);
}

// ============================================
// 🔹 تعديل الدين مع عكس الحركة على الصندوق
// 🔸 الخطوة 1: عكس تأثير الحركة القديمة على الصندوق
// 🔸 الخطوة 2: تحديث سجل الدين
// 🔸 الخطوة 3: تطبيق تأثير الحركة الجديدة على الصندوق
// 🔸 منطق الصناديق:
//   - لنا + كاش → خصم من الصندوق (نخرج مبلغ للطرف الآخر)
//   - لنا + آجل → لا تأثير
//   - علينا + كاش → إضافة للصندوق (نستلم مبلغ من الطرف الآخر)
//   - علينا + آجل → لا تأثير
// ============================================
export async function editDebtWithVaultReversal(id: string, newData: {
  accountId?: string;
  currencyId?: string;
  amount?: number;
  conversionFactor?: number;
  conversionMethod?: 'MULTIPLY' | 'DIVIDE';
  description?: string | null;
  date?: string;
  debtType?: 'RECEIVABLE' | 'PAYABLE';
  debtMode?: 'CASH' | 'DEFERRED';
}): Promise<Debt> {
  await initializeDatabase();
  const now = new Date();

  // 🔸 الخطوة 1: جلب الدين القديم وعكس تأثيره على الصندوق
  const { data: oldDebtRow } = await supabase.from('debts').select('*').eq('id', id).single();
  if (!oldDebtRow) throw new Error('الدين غير موجود');
  const oldDebt = rowToDebt(oldDebtRow);

  const oldCurrencyId = oldDebt.currencyId;

  // عكس تأثير الدين القديم على الصندوق - NO LONGER needed, recalculateVaultBalance handles it

  // 🔸 الخطوة 2: حساب finalBalance الجديد
  const newAmount = newData.amount ?? oldDebt.amount;
  const newConversionFactor = newData.conversionFactor ?? oldDebt.conversionFactor;
  const newConversionMethod = newData.conversionMethod ?? oldDebt.conversionMethod;
  const newCurrencyId = newData.currencyId ?? oldDebt.currencyId;
  const newDebtType = newData.debtType ?? oldDebt.debtType;
  const newDebtMode = newData.debtMode ?? oldDebt.debtMode;

  let newFinalBalance = newAmount;
  if (newConversionMethod === 'MULTIPLY') {
    newFinalBalance = newAmount * newConversionFactor;
  } else {
    newFinalBalance = newAmount / newConversionFactor;
  }

  // 🔸 الخطوة 2.5: تحديث سجل الدين
  const updatedFields: Record<string, unknown> = {
    accountId: newData.accountId ?? oldDebt.accountId,
    currencyId: newCurrencyId,
    amount: newAmount,
    conversionFactor: newConversionFactor,
    conversionMethod: newConversionMethod,
    finalBalance: newFinalBalance,
    description: newData.description !== undefined ? newData.description : oldDebt.description,
    debtType: newDebtType,
    debtMode: newDebtMode,
    date: newData.date ? new Date(newData.date).toISOString() : oldDebt.date,
    updatedAt: now,
  };

  const { error: updateError } = await supabase.from('debts').update(
    debtToRow(updatedFields as Partial<Debt>)
  ).eq('id', id);
  if (updateError) throw new Error(updateError.message);

  // Recalculate vault balances for old and new currencies (if changed)
  const affectedCurrencyIds = new Set<string>();
  affectedCurrencyIds.add(oldCurrencyId);
  if (newCurrencyId !== oldCurrencyId) {
    affectedCurrencyIds.add(newCurrencyId);
  }
  if (oldDebt.debtMode === 'CASH' || newDebtMode === 'CASH') {
    for (const cid of affectedCurrencyIds) {
      await recalculateVaultBalance(cid);
    }
  }

  // 🔸 إعادة حساب حالة isPaid للدين
  const { data: allPaymentRows } = await supabase.from('debt_payments').select('*').eq('debt_id', id);
  const allPayments = (allPaymentRows || []).map(rowToDebtPayment);
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= newFinalBalance && !oldDebt.isPaid) {
    await supabase.from('debts').update({
      is_paid: true,
      paid_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq('id', id);
  } else if (totalPaid < newFinalBalance && oldDebt.isPaid) {
    await supabase.from('debts').update({
      is_paid: false,
      paid_at: null,
      updated_at: now.toISOString(),
    }).eq('id', id);
  }

  // 🔸 إرجاع الدين المحدّث
  const { data: updatedRow, error: refetchError } = await supabase.from('debts').select('*').eq('id', id).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToDebt(updatedRow);
}

// ============================================
// 🔹 تعديل دفعة السداد مع عكس الحركة على الصندوق
// 🔸 الخطوة 1: عكس تأثير الدفعة القديمة على الصندوق
// 🔸 الخطوة 2: تحديث سجل الدفعة
// 🔸 الخطوة 3: تطبيق تأثير الدفعة الجديدة على الصندوق
// 🔸 منطق الصناديق:
//   - لنا + كاش → خصم من الصندوق (نخرج مبلغ للطرف الآخر)
//   - لنا + آجل → لا تأثير
//   - علينا + كاش → إضافة للصندوق (نستلم مبلغ من الطرف الآخر)
//   - علينا + آجل → لا تأثير
// ============================================
export async function editDebtPaymentWithVaultReversal(id: string, newData: {
  amount?: number;
  currencyId?: string;
  description?: string | null;
  date?: string;
  paymentMode?: 'CASH' | 'DEFERRED';
  paymentDirection?: 'RECEIVABLE' | 'PAYABLE';
}): Promise<DebtPayment> {
  await initializeDatabase();
  const now = new Date();

  // 🔸 الخطوة 1: جلب الدفعة القديمة وعكس تأثيرها على الصندوق
  const { data: oldPaymentRow } = await supabase.from('debt_payments').select('*').eq('id', id).single();
  if (!oldPaymentRow) throw new Error('الدفعة غير موجودة');
  const oldPayment = rowToDebtPayment(oldPaymentRow);

  // جلب الدين المرتبط
  const { data: debtRow } = await supabase.from('debts').select('*').eq('id', oldPayment.debtId).single();
  const debt = debtRow ? rowToDebt(debtRow) : null;

  const oldPaymentMode = oldPayment.paymentMode || 'CASH';
  const oldPaymentDirection = oldPayment.paymentDirection || debt?.debtType || 'RECEIVABLE';
  const oldCurrencyId = oldPayment.currencyId;

  // عكس تأثير الدفعة القديمة على الصندوق - NO LONGER needed, recalculateVaultBalance handles it

  // 🔸 الخطوة 2: تحديث سجل الدفعة
  const newAmount = newData.amount ?? oldPayment.amount;
  const newCurrencyId = newData.currencyId ?? oldPayment.currencyId;
  const newPaymentMode = newData.paymentMode ?? oldPaymentMode;
  const newPaymentDirection = newData.paymentDirection ?? oldPaymentDirection;

  const updatedFields: Record<string, unknown> = {
    amount: newAmount,
    currencyId: newCurrencyId,
    description: newData.description !== undefined ? newData.description : oldPayment.description,
    date: newData.date ? new Date(newData.date).toISOString() : oldPayment.date,
    paymentMode: newPaymentMode,
    paymentDirection: newPaymentDirection,
    updatedAt: now,
  };

  const { error: updateError } = await supabase.from('debt_payments').update(
    debtPaymentToRow(updatedFields as Partial<DebtPayment>)
  ).eq('id', id);
  if (updateError) throw new Error(updateError.message);

  // Recalculate vault balances for old and new currencies (if changed)
  const affectedCurrencyIds = new Set<string>();
  affectedCurrencyIds.add(oldCurrencyId);
  if (newCurrencyId !== oldCurrencyId) {
    affectedCurrencyIds.add(newCurrencyId);
  }
  if (oldPaymentMode === 'CASH' || newPaymentMode === 'CASH') {
    for (const cid of affectedCurrencyIds) {
      await recalculateVaultBalance(cid);
    }
  }

  // 🔸 إعادة حساب حالة isPaid للدين
  if (debt) {
    const { data: allPaymentRows } = await supabase.from('debt_payments').select('*').eq('debt_id', oldPayment.debtId);
    const allPayments = (allPaymentRows || []).map(rowToDebtPayment);
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= debt.finalBalance && !debt.isPaid) {
      await supabase.from('debts').update({
        is_paid: true,
        paid_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', oldPayment.debtId);
    } else if (totalPaid < debt.finalBalance && debt.isPaid) {
      await supabase.from('debts').update({
        is_paid: false,
        paid_at: null,
        updated_at: now.toISOString(),
      }).eq('id', oldPayment.debtId);
    }
  }

  // 🔸 إرجاع الدفعة المحدّثة
  const { data: updatedRow, error: refetchError } = await supabase.from('debt_payments').select('*').eq('id', id).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToDebtPayment(updatedRow);
}

export async function deleteDebt(id: string): Promise<void> {
  await initializeDatabase();
  
  const { data: debtRow } = await supabase.from('debts').select('*').eq('id', id).single();
  if (!debtRow) throw new Error('الدين غير موجود');
  
  const debt = rowToDebt(debtRow);
  
  // Collect affected currency IDs for recalculation
  const affectedCurrencyIds = new Set<string>();
  
  // Reverse vault effect for CASH debts
  if (debt.debtMode === 'CASH') {
    affectedCurrencyIds.add(debt.currencyId);
  }
  
  // Process related payments
  const { data: paymentRows } = await supabase.from('debt_payments').select('*').eq('debt_id', id);
  const payments = (paymentRows || []).map(rowToDebtPayment);
  
  for (const payment of payments) {
    const paymentMode = payment.paymentMode || 'CASH';
    
    if (paymentMode === 'CASH') {
      affectedCurrencyIds.add(payment.currencyId);
    }
    
    // Handle overflow transaction linked to payment
    if (payment.overflowTransactionId) {
      const { data: overflowRow } = await supabase.from('transactions').select('*').eq('id', payment.overflowTransactionId).single();
      
      if (overflowRow) {
        const overflowTransaction = rowToTransaction(overflowRow);
        if (overflowTransaction.paymentType === 'CASH') {
          affectedCurrencyIds.add(overflowTransaction.currencyId);
        }
        await supabase.from('transactions').delete().eq('id', payment.overflowTransactionId);
      }
    }
    
    // Delete payment
    await supabase.from('debt_payments').delete().eq('id', payment.id);
  }
  
  // Delete debt
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  
  // Recalculate vault balances for all affected currencies
  for (const cid of affectedCurrencyIds) {
    await recalculateVaultBalance(cid);
  }
}

// ============================================
// Debt Payment Functions
// ============================================

export async function getDebtPayments(debtId?: string, options?: { includeArchived?: boolean }): Promise<DebtPayment[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const includeArchived = options?.includeArchived ?? false;
  if (debtId) {
    const result = await fetchWithRetry(async () => {
      let query = supabase.from('debt_payments').select('*').eq('debt_id', debtId);
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
    if (result === null) {
      console.error('[Supabase] ❌ getDebtPayments: failed after retries, returning []');
      return [];
    }
    return (result || []).map(rowToDebtPayment);
  }
  const result = await fetchWithRetry(async () => {
    let query = supabase.from('debt_payments').select('*').order('date', { ascending: false });
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getDebtPayments: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToDebtPayment);
}

export async function updateDebtPayment(id: string, data: Partial<DebtPayment>): Promise<DebtPayment> {
  await initializeDatabase();
  const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const { error } = await supabase.from('debt_payments').update(debtPaymentToRow(updateFields as Partial<DebtPayment>)).eq('id', id);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow, error: refetchError } = await supabase.from('debt_payments').select('*').eq('id', id).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToDebtPayment(updatedRow);
}

export async function addDebtPayment(data: {
  debtId: string;
  amount: number;
  currencyId: string;
  description?: string;
  date: string;
  paymentMode?: 'CASH' | 'DEFERRED';
  direction?: 'RECEIVABLE' | 'PAYABLE';
  currentBalance?: number;
}): Promise<DebtPayment> {
  await initializeDatabase();
  const now = new Date();
  
  const { data: debtRow } = await supabase.from('debts').select('*').eq('id', data.debtId).single();
  if (!debtRow) throw new Error('الدين غير موجود');
  const debt = rowToDebt(debtRow);
  
  const paymentMode = data.paymentMode || 'CASH';
  
  let paymentDirection: 'RECEIVABLE' | 'PAYABLE';
  
  if (data.currentBalance !== undefined) {
    paymentDirection = data.currentBalance < 0 ? 'RECEIVABLE' : 'PAYABLE';
  } else {
    paymentDirection = data.direction || debt.debtType || 'RECEIVABLE';
  }
  
  const payment: DebtPayment = {
    id: generateId(),
    debtId: data.debtId,
    amount: data.amount,
    currencyId: data.currencyId,
    description: data.description,
    date: new Date(data.date),
    paymentMode,
    paymentDirection,
    overflowTransactionId: null,
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('debt_payments').insert([debtPaymentToRow(payment)]);
  if (error) throw new Error(error.message);
  
  // Update debt paid status
  const { data: allPaymentRows } = await supabase.from('debt_payments').select('*').eq('debt_id', data.debtId);
  const allPayments = (allPaymentRows || []).map(rowToDebtPayment);
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  
  if (totalPaid >= debt.finalBalance) {
    await supabase.from('debts').update({
      is_paid: true,
      paid_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq('id', data.debtId);
  }
  
  // Recalculate vault balance for CASH payments
  if (paymentMode === 'CASH') {
    await recalculateVaultBalance(data.currencyId);
  }
  
  return payment;
}

export async function deleteDebtPayment(id: string): Promise<void> {
  await initializeDatabase();
  
  const { data: paymentRow } = await supabase.from('debt_payments').select('*').eq('id', id).single();
  if (!paymentRow) throw new Error('الدفعة غير موجودة');
  
  const payment = rowToDebtPayment(paymentRow);
  
  const { data: debtRow } = await supabase.from('debts').select('*').eq('id', payment.debtId).single();
  const debt = debtRow ? rowToDebt(debtRow) : null;
  
  // Collect affected currency IDs for recalculation
  const affectedCurrencyIds = new Set<string>();
  
  if (debt) {
    const paymentMode = payment.paymentMode || 'CASH';
    
    if (paymentMode === 'CASH') {
      affectedCurrencyIds.add(payment.currencyId);
    }
    
    // Handle overflow transaction
    if (payment.overflowTransactionId) {
      const { data: overflowRow } = await supabase.from('transactions').select('*').eq('id', payment.overflowTransactionId).single();
      if (overflowRow) {
        const overflowTransaction = rowToTransaction(overflowRow);
        
        if (overflowTransaction.paymentType === 'CASH') {
          affectedCurrencyIds.add(overflowTransaction.currencyId);
        }
        
        await supabase.from('transactions').delete().eq('id', payment.overflowTransactionId);
      }
    }
    
    // Update debt paid status
    const { data: remainingPaymentRows } = await supabase.from('debt_payments').select('*').eq('debt_id', payment.debtId);
    const remainingPayments = (remainingPaymentRows || []).map(rowToDebtPayment).filter(p => p.id !== id);
    const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPaid < debt.finalBalance && debt.isPaid) {
      await supabase.from('debts').update({
        is_paid: false,
        paid_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.debtId);
    }
  }
  
  // Delete payment
  const { error } = await supabase.from('debt_payments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  
  // Recalculate vault balances for all affected currencies
  for (const cid of affectedCurrencyIds) {
    await recalculateVaultBalance(cid);
  }
}

// ============================================
// Total Debt Remaining
// ============================================

export async function getTotalDebtRemaining(): Promise<{
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
}> {
  await initializeDatabase();
  if (!tablesExist) {
    return {
      totalDebts: 0, totalPaid: 0, totalRemaining: 0, unpaidDebtsCount: 0, paidDebtsCount: 0,
      totalReceivable: 0, totalPayable: 0, totalReceivablePaid: 0, totalPayablePaid: 0,
      totalReceivableRemaining: 0, totalPayableRemaining: 0,
      deferredReceivable: 0, deferredPayable: 0, deferredReceivablePaid: 0, deferredPayablePaid: 0,
      deferredReceivableRemaining: 0, deferredPayableRemaining: 0,
      cashReceivable: 0, cashPayable: 0, cashReceivablePaid: 0, cashPayablePaid: 0,
      cashReceivableRemaining: 0, cashPayableRemaining: 0,
    };
  }
  
  const { data: debtRows } = await supabase.from('debts').select('*');
  const allDebts = (debtRows || []).map(rowToDebt);
  
  const { data: paymentRows } = await supabase.from('debt_payments').select('*');
  const allPayments = (paymentRows || []).map(rowToDebtPayment);
  
  const receivableDebts = allDebts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
  const payableDebts = allDebts.filter(d => d.debtType === 'PAYABLE');
  
  const deferredReceivableDebts = receivableDebts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);
  const deferredPayableDebts = payableDebts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);
  const cashReceivableDebts = receivableDebts.filter(d => d.debtMode === 'CASH');
  const cashPayableDebts = payableDebts.filter(d => d.debtMode === 'CASH');
  
  const totalReceivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalPayable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalDebts = allDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  const deferredReceivable = deferredReceivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const deferredPayable = deferredPayableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  const cashReceivable = cashReceivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const cashPayable = cashPayableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  const paymentsByDebt = new Map<string, number>();
  for (const payment of allPayments) {
    const current = paymentsByDebt.get(payment.debtId) || 0;
    paymentsByDebt.set(payment.debtId, current + payment.amount);
  }
  
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  
  let totalReceivablePaid = 0;
  let totalPayablePaid = 0;
  for (const debt of receivableDebts) {
    totalReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of payableDebts) {
    totalPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  let deferredReceivablePaid = 0;
  let deferredPayablePaid = 0;
  for (const debt of deferredReceivableDebts) {
    deferredReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of deferredPayableDebts) {
    deferredPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  let cashReceivablePaid = 0;
  let cashPayablePaid = 0;
  for (const debt of cashReceivableDebts) {
    cashReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of cashPayableDebts) {
    cashPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  const totalReceivableRemaining = totalReceivable - totalReceivablePaid;
  const totalPayableRemaining = totalPayable - totalPayablePaid;
  const totalRemaining = totalDebts - totalPaid;
  
  const deferredReceivableRemaining = deferredReceivable - deferredReceivablePaid;
  const deferredPayableRemaining = deferredPayable - deferredPayablePaid;
  
  const cashReceivableRemaining = cashReceivable - cashReceivablePaid;
  const cashPayableRemaining = cashPayable - cashPayablePaid;
  
  let paidDebtsCount = 0;
  for (const debt of allDebts) {
    const paid = paymentsByDebt.get(debt.id) || 0;
    if (paid >= debt.finalBalance) {
      paidDebtsCount++;
    }
  }
  
  return {
    totalDebts,
    totalPaid,
    totalRemaining,
    unpaidDebtsCount: allDebts.length - paidDebtsCount,
    paidDebtsCount,
    totalReceivable,
    totalPayable,
    totalReceivablePaid,
    totalPayablePaid,
    totalReceivableRemaining,
    totalPayableRemaining,
    deferredReceivable,
    deferredPayable,
    deferredReceivablePaid,
    deferredPayablePaid,
    deferredReceivableRemaining,
    deferredPayableRemaining,
    cashReceivable,
    cashPayable,
    cashReceivablePaid,
    cashPayablePaid,
    cashReceivableRemaining,
    cashPayableRemaining,
  };
}

// ============================================
// Account-Specific Debt Statistics
// ============================================

export async function getAccountDebtSummary(accountId: string): Promise<AccountDebtSummary> {
  await initializeDatabase();
  if (!tablesExist) {
    return {
      accountId, account: undefined, totalReceivable: 0, totalPayable: 0,
      totalReceivablePaid: 0, totalPayablePaid: 0, totalReceivableRemaining: 0,
      totalPayableRemaining: 0, finalBalance: 0, debts: [], payments: [],
      currencyBreakdown: [],
    };
  }
  
  const { data: accountRow } = await supabase.from('accounts').select('*').eq('id', accountId).single();
  const account = accountRow ? rowToAccount(accountRow) : undefined;
  
  const { data: debtRows } = await supabase.from('debts').select('*').eq('account_id', accountId);
  const allDebts = (debtRows || []).map(rowToDebt);
  
  const debtIds = allDebts.map(d => d.id);
  
  const allPayments: DebtPayment[] = [];
  if (debtIds.length > 0) {
    const { data: paymentRows } = await supabase.from('debt_payments').select('*').in('debt_id', debtIds);
    if (paymentRows) {
      allPayments.push(...paymentRows.map(rowToDebtPayment));
    }
  }
  
  const paymentsByDebt = new Map<string, number>();
  for (const payment of allPayments) {
    const current = paymentsByDebt.get(payment.debtId) || 0;
    paymentsByDebt.set(payment.debtId, current + payment.amount);
  }
  
  // ============================================
  // 🔹 حسابات حسب العملة (لا ندمج عملات مختلفة)
  // ============================================
  const currencyIds = [...new Set(allDebts.map(d => d.currencyId))];
  
  const currencyBreakdown: CurrencyDebtSummary[] = currencyIds.map(currencyId => {
    const currencyDebts = allDebts.filter(d => d.currencyId === currencyId);
    const receivableDebts = currencyDebts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
    const payableDebts = currencyDebts.filter(d => d.debtType === 'PAYABLE');
    
    const receivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    const payable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
    
    let receivablePaid = 0;
    let payablePaid = 0;
    
    for (const debt of receivableDebts) {
      receivablePaid += paymentsByDebt.get(debt.id) || 0;
    }
    for (const debt of payableDebts) {
      payablePaid += paymentsByDebt.get(debt.id) || 0;
    }
    
    const receivableRemaining = receivable - receivablePaid;
    const payableRemaining = payable - payablePaid;
    const netBalance = receivableRemaining - payableRemaining;
    
    return {
      currencyId,
      receivable,
      payable,
      receivablePaid,
      payablePaid,
      receivableRemaining,
      payableRemaining,
      netBalance,
    };
  });
  
  // ============================================
  // 🔹 الحسابات العامة (للتوافق مع الكود القديم)
  // 🔸 ملاحظة: هذه القيم تدمج العملات ولا ينبغي استخدامها للعرض
  // ============================================
  const receivableDebts = allDebts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
  const payableDebts = allDebts.filter(d => d.debtType === 'PAYABLE');
  
  const totalReceivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalPayable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  let totalReceivablePaid = 0;
  let totalPayablePaid = 0;
  
  for (const debt of receivableDebts) {
    totalReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of payableDebts) {
    totalPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  const totalReceivableRemaining = totalReceivable - totalReceivablePaid;
  const totalPayableRemaining = totalPayable - totalPayablePaid;
  
  const finalBalance = totalReceivableRemaining - totalPayableRemaining;
  
  return {
    accountId,
    account,
    totalReceivable,
    totalPayable,
    totalReceivablePaid,
    totalPayablePaid,
    totalReceivableRemaining,
    totalPayableRemaining,
    finalBalance,
    debts: allDebts,
    payments: allPayments,
    currencyBreakdown,
  };
}

export async function getAllAccountsDebtSummary(): Promise<AccountDebtSummary[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  
  const { data: accountRows } = await supabase.from('accounts').select('*').eq('is_active', true);
  const accounts = (accountRows || []).map(rowToAccount);
  
  const summaries: AccountDebtSummary[] = [];
  
  for (const account of accounts) {
    const summary = await getAccountDebtSummary(account.id);
    if (summary.debts.length > 0) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

// ============================================
// Export / Import Functions
// ============================================

export async function exportAllData(): Promise<{
  currencies: Currency[];
  vaults: Vault[];
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  currencyExchanges: CurrencyExchange[];
  exportDate: string;
  version: string;
}> {
  await initializeDatabase();
  
  const [currencyRows, vaultRows, accountRows, transactionRows, debtRows, paymentRows, exchangeRows] = await Promise.all([
    supabase.from('currencies').select('*'),
    supabase.from('vaults').select('*'),
    supabase.from('accounts').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('debts').select('*'),
    supabase.from('debt_payments').select('*'),
    supabase.from('currency_exchanges').select('*'),
  ]);
  
  return {
    currencies: (currencyRows.data || []).map(rowToCurrency),
    vaults: (vaultRows.data || []).map(rowToVault),
    accounts: (accountRows.data || []).map(rowToAccount),
    transactions: (transactionRows.data || []).map(rowToTransaction),
    debts: (debtRows.data || []).map(rowToDebt),
    debtPayments: (paymentRows.data || []).map(rowToDebtPayment),
    currencyExchanges: (exchangeRows.data || []).map(rowToCurrencyExchange),
    exportDate: new Date().toISOString(),
    version: '1.0.0',
  };
}

export async function importAllData(
  data: {
    currencies?: Currency[];
    vaults?: Vault[];
    accounts?: Account[];
    transactions?: Transaction[];
    debts?: Debt[];
    debtPayments?: DebtPayment[];
    currencyExchanges?: CurrencyExchange[];
  },
  mergeMode: boolean = true
): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  try {
    if (!mergeMode) {
      // Replace: delete all existing data
      await Promise.all([
        supabase.from('currencies').delete().neq('id', '__never_match__'),
        supabase.from('vaults').delete().neq('id', '__never_match__'),
        supabase.from('accounts').delete().neq('id', '__never_match__'),
        supabase.from('transactions').delete().neq('id', '__never_match__'),
        supabase.from('debts').delete().neq('id', '__never_match__'),
        supabase.from('debt_payments').delete().neq('id', '__never_match__'),
        supabase.from('currency_exchanges').delete().neq('id', '__never_match__'),
      ]);
    }
    
    // Import currencies
    if (data.currencies && data.currencies.length > 0) {
      for (const currency of data.currencies) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('currencies').select('id').eq('id', currency.id);
          if (existing && existing.length > 0) {
            await supabase.from('currencies').update(currencyToRow(currency)).eq('id', currency.id);
          } else {
            await supabase.from('currencies').insert([currencyToRow(currency)]);
          }
        } else {
          await supabase.from('currencies').insert([currencyToRow(currency)]);
        }
      }
    }
    
    // Import vaults
    if (data.vaults && data.vaults.length > 0) {
      for (const vault of data.vaults) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('vaults').select('*').eq('id', vault.id);
          if (existing && existing.length > 0) {
            const existingVault = rowToVault(existing[0]);
            await supabase.from('vaults').update({
              ...vaultToRow(vault),
              balance: existingVault.balance + vault.balance,
              opening_balance: existingVault.openingBalance + vault.openingBalance,
            }).eq('id', vault.id);
          } else {
            await supabase.from('vaults').insert([vaultToRow(vault)]);
          }
        } else {
          await supabase.from('vaults').insert([vaultToRow(vault)]);
        }
      }
    }
    
    // Import accounts
    if (data.accounts && data.accounts.length > 0) {
      for (const account of data.accounts) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('accounts').select('id').eq('id', account.id);
          if (existing && existing.length > 0) {
            await supabase.from('accounts').update(accountToRow(account)).eq('id', account.id);
          } else {
            await supabase.from('accounts').insert([accountToRow(account)]);
          }
        } else {
          await supabase.from('accounts').insert([accountToRow(account)]);
        }
      }
    }
    
    // Import transactions (merge: add only new)
    if (data.transactions && data.transactions.length > 0) {
      for (const transaction of data.transactions) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('transactions').select('id').eq('id', transaction.id);
          if (!existing || existing.length === 0) {
            await supabase.from('transactions').insert([transactionToRow(transaction)]);
          }
        } else {
          await supabase.from('transactions').insert([transactionToRow(transaction)]);
        }
      }
    }
    
    // Import debts (merge: add only new)
    if (data.debts && data.debts.length > 0) {
      for (const debt of data.debts) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('debts').select('id').eq('id', debt.id);
          if (!existing || existing.length === 0) {
            await supabase.from('debts').insert([debtToRow(debt)]);
          }
        } else {
          await supabase.from('debts').insert([debtToRow(debt)]);
        }
      }
    }
    
    // Import debt payments (merge: add only new)
    if (data.debtPayments && data.debtPayments.length > 0) {
      for (const payment of data.debtPayments) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('debt_payments').select('id').eq('id', payment.id);
          if (!existing || existing.length === 0) {
            await supabase.from('debt_payments').insert([debtPaymentToRow(payment)]);
          }
        } else {
          await supabase.from('debt_payments').insert([debtPaymentToRow(payment)]);
        }
      }
    }
    
    // Import currency exchanges (merge: add only new)
    if (data.currencyExchanges && data.currencyExchanges.length > 0) {
      for (const exchange of data.currencyExchanges) {
        if (mergeMode) {
          const { data: existing } = await supabase.from('currency_exchanges').select('id').eq('id', exchange.id);
          if (!existing || existing.length === 0) {
            await supabase.from('currency_exchanges').insert([currencyExchangeToRow(exchange)]);
          }
        } else {
          await supabase.from('currency_exchanges').insert([currencyExchangeToRow(exchange)]);
        }
      }
    }
    
    // After importing all data, recalculate vault balances
    await recalculateAllVaultBalances();
    
    return { success: true, message: 'تم استيراد البيانات بنجاح' };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, message: 'حدث خطأ أثناء استيراد البيانات' };
  }
}

/**
 * Recalculate all vault balances after import
 * Called after importing all data to ensure consistency
 */
export async function recalculateAllVaultBalances(): Promise<void> {
  await initializeDatabase();
  const { data: vaultRows } = await supabase.from('vaults').select('*');
  const vaults = (vaultRows || []).map(rowToVault);
  for (const vault of vaults) {
    await recalculateVaultBalance(vault.currencyId);
  }
}

export async function clearAllData(): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  try {
    // 🔴 CRITICAL: Auto-create backup BEFORE any deletion
    // No data can be deleted without a backup!
    try {
      console.log('[Backup] 🔄 Creating pre-delete backup...');
      const backup = await createBackup('pre_delete');
      console.log(`[Backup] ✅ Pre-delete backup created: ${backup.id}`);
    } catch (backupError) {
      console.error('[Backup] ❌ Failed to create pre-delete backup! ABORTING deletion:', backupError);
      return { success: false, message: 'فشل إنشاء النسخة الاحتياطية قبل الحذف. لا يمكن حذف البيانات بدون نسخة احتياطية.' };
    }

    // Delete transactions
    await supabase.from('transactions').delete().neq('id', '__never_match__');
    
    // Delete debts and payments
    await supabase.from('debt_payments').delete().neq('id', '__never_match__');
    await supabase.from('debts').delete().neq('id', '__never_match__');
    
    // Delete currency exchanges
    await supabase.from('currency_exchanges').delete().neq('id', '__never_match__');
    
    // Reset vault balances - recalculate from opening balance (now 0 operations remain)
    const { data: vaultRows } = await supabase.from('vaults').select('*');
    const vaults = (vaultRows || []).map(rowToVault);
    for (const vault of vaults) {
      await supabase.from('vaults').update({
        balance: vault.openingBalance || 0,
        opening_balance_date: null,
        updated_at: new Date().toISOString(),
      }).eq('id', vault.id);
    }
    
    return { success: true, message: 'تم مسح البيانات بنجاح مع الحفاظ على الحسابات والعملات' };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, message: 'حدث خطأ أثناء مسح البيانات' };
  }
}

// ============================================
// Backup System Functions
// ============================================

export interface BackupRecord {
  id: string;
  reason: 'manual' | 'pre_delete' | 'pre_archive' | 'auto';
  data: Record<string, unknown>;
  recordCounts: {
    currencies: number;
    vaults: number;
    accounts: number;
    transactions: number;
    debts: number;
    debtPayments: number;
    currencyExchanges: number;
  };
  sizeBytes: number;
  createdAt: Date;
}

function rowToBackupRecord(row: Record<string, unknown>): BackupRecord {
  const obj = toCamelCase<BackupRecord>(row);
  obj.createdAt = new Date(obj.createdAt as unknown as string);
  return obj;
}

const MAX_BACKUPS = 5;

/**
 * Create a backup snapshot of all data.
 * Stores the full data snapshot in the `backups` table.
 * Auto-cleans old backups to keep only the last MAX_BACKUPS.
 */
export async function createBackup(reason: 'manual' | 'pre_delete' | 'pre_archive' | 'auto' = 'manual'): Promise<BackupRecord> {
  await initializeDatabase();

  // 1. Export all data (reuse exportAllData logic inline for JSON storage)
  const [currencyRows, vaultRows, accountRows, transactionRows, debtRows, paymentRows, exchangeRows] = await Promise.all([
    supabase.from('currencies').select('*'),
    supabase.from('vaults').select('*'),
    supabase.from('accounts').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('debts').select('*'),
    supabase.from('debt_payments').select('*'),
    supabase.from('currency_exchanges').select('*'),
  ]);

  const backupData = {
    currencies: currencyRows.data || [],
    vaults: vaultRows.data || [],
    accounts: accountRows.data || [],
    transactions: transactionRows.data || [],
    debts: debtRows.data || [],
    debtPayments: paymentRows.data || [],
    currencyExchanges: exchangeRows.data || [],
  };

  const recordCounts = {
    currencies: backupData.currencies.length,
    vaults: backupData.vaults.length,
    accounts: backupData.accounts.length,
    transactions: backupData.transactions.length,
    debts: backupData.debts.length,
    debtPayments: backupData.debtPayments.length,
    currencyExchanges: backupData.currencyExchanges.length,
  };

  // Calculate size in bytes
  const dataJson = JSON.stringify(backupData);
  const sizeBytes = new Blob([dataJson]).size;

  // 2. Generate backup ID
  const id = 'bkp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

  // 3. Insert backup record
  const { error: insertError } = await supabase.from('backups').insert([{
    id,
    reason,
    data: backupData,
    record_counts: recordCounts,
    size_bytes: sizeBytes,
    created_at: new Date().toISOString(),
  }]);

  if (insertError) {
    console.error('[Backup] ❌ Failed to create backup:', insertError);
    throw new Error('فشل إنشاء النسخة الاحتياطية: ' + insertError.message);
  }

  console.log(`[Backup] ✅ Backup created: ${id} (${reason}, ${sizeBytes} bytes)`);

  // 4. Auto-cleanup: keep only last MAX_BACKUPS
  await cleanupOldBackups();

  // 5. Return the backup record
  const result: BackupRecord = {
    id,
    reason,
    data: backupData as unknown as Record<string, unknown>,
    recordCounts: recordCounts,
    sizeBytes,
    createdAt: new Date(),
  };

  return result;
}

/**
 * Get all backups, ordered by creation date (newest first).
 */
export async function getBackups(): Promise<BackupRecord[]> {
  await initializeDatabase();
  if (!tablesExist) return [];

  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('backups')
      .select('id, reason, record_counts, size_bytes, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  });

  if (result === null) {
    console.error('[Backup] ❌ getBackups: failed after retries');
    return [];
  }

  return (result || []).map(row => rowToBackupRecord(row as Record<string, unknown>));
}

/**
 * Get a single backup by ID (including full data).
 */
export async function getBackupById(backupId: string): Promise<BackupRecord | null> {
  await initializeDatabase();
  if (!tablesExist) return null;

  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .single();
    if (error) throw error;
    return data;
  });

  if (result === null) return null;
  return rowToBackupRecord(result as Record<string, unknown>);
}

/**
 * Restore data from a specific backup.
 * This will:
 * 1. Create a pre-restore backup (safety net)
 * 2. Clear current data
 * 3. Import backup data
 * 4. Recalculate vault balances
 */
export async function restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();

  try {
    // 1. Get backup data
    const backup = await getBackupById(backupId);
    if (!backup) {
      return { success: false, message: 'النسخة الاحتياطية غير موجودة' };
    }

    // 2. Create a safety backup before restoring
    try {
      await createBackup('auto'); // Safety net before restore
    } catch (e) {
      console.warn('[Backup] ⚠️ Failed to create pre-restore safety backup:', e);
      // Continue anyway — don't block the restore
    }

    // 3. Get the full backup data (with all rows)
    const result = await fetchWithRetry(async () => {
      const { data, error } = await supabase
        .from('backups')
        .select('data')
        .eq('id', backupId)
        .single();
      if (error) throw error;
      return data;
    });

    if (!result || !result.data) {
      return { success: false, message: 'فشل قراءة بيانات النسخة الاحتياطية' };
    }

    const backupData = result.data as {
      currencies?: Record<string, unknown>[];
      vaults?: Record<string, unknown>[];
      accounts?: Record<string, unknown>[];
      transactions?: Record<string, unknown>[];
      debts?: Record<string, unknown>[];
      debtPayments?: Record<string, unknown>[];
      currencyExchanges?: Record<string, unknown>[];
    };

    // 4. Clear existing data (transactions, debts, payments, exchanges only)
    await Promise.all([
      supabase.from('transactions').delete().neq('id', '__never_match__'),
      supabase.from('debt_payments').delete().neq('id', '__never_match__'),
      supabase.from('debts').delete().neq('id', '__never_match__'),
      supabase.from('currency_exchanges').delete().neq('id', '__never_match__'),
    ]);

    // 5. Restore data from backup
    // Currencies: upsert
    if (backupData.currencies && backupData.currencies.length > 0) {
      for (const row of backupData.currencies) {
        const { data: existing } = await supabase.from('currencies').select('id').eq('id', row.id);
        if (existing && existing.length > 0) {
          await supabase.from('currencies').update(row).eq('id', row.id);
        } else {
          await supabase.from('currencies').insert([row]);
        }
      }
    }

    // Vaults: upsert
    if (backupData.vaults && backupData.vaults.length > 0) {
      for (const row of backupData.vaults) {
        const { data: existing } = await supabase.from('vaults').select('id').eq('id', row.id);
        if (existing && existing.length > 0) {
          await supabase.from('vaults').update(row).eq('id', row.id);
        } else {
          await supabase.from('vaults').insert([row]);
        }
      }
    }

    // Accounts: upsert
    if (backupData.accounts && backupData.accounts.length > 0) {
      for (const row of backupData.accounts) {
        const { data: existing } = await supabase.from('accounts').select('id').eq('id', row.id);
        if (existing && existing.length > 0) {
          await supabase.from('accounts').update(row).eq('id', row.id);
        } else {
          await supabase.from('accounts').insert([row]);
        }
      }
    }

    // Transactions: insert
    if (backupData.transactions && backupData.transactions.length > 0) {
      // Insert in batches of 50 to avoid payload size limits
      const batchSize = 50;
      for (let i = 0; i < backupData.transactions.length; i += batchSize) {
        const batch = backupData.transactions.slice(i, i + batchSize);
        await supabase.from('transactions').insert(batch);
      }
    }

    // Debts: insert
    if (backupData.debts && backupData.debts.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < backupData.debts.length; i += batchSize) {
        const batch = backupData.debts.slice(i, i + batchSize);
        await supabase.from('debts').insert(batch);
      }
    }

    // Debt Payments: insert
    if (backupData.debtPayments && backupData.debtPayments.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < backupData.debtPayments.length; i += batchSize) {
        const batch = backupData.debtPayments.slice(i, i + batchSize);
        await supabase.from('debt_payments').insert(batch);
      }
    }

    // Currency Exchanges: insert
    if (backupData.currencyExchanges && backupData.currencyExchanges.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < backupData.currencyExchanges.length; i += batchSize) {
        const batch = backupData.currencyExchanges.slice(i, i + batchSize);
        await supabase.from('currency_exchanges').insert(batch);
      }
    }

    // 6. Recalculate vault balances
    await recalculateAllVaultBalances();

    console.log(`[Backup] ✅ Restored from backup: ${backupId}`);
    return { success: true, message: 'تم استرجاع البيانات بنجاح من النسخة الاحتياطية' };
  } catch (error) {
    console.error('[Backup] ❌ Restore failed:', error);
    return { success: false, message: 'حدث خطأ أثناء استرجاع البيانات: ' + (error instanceof Error ? error.message : 'خطأ غير معروف') };
  }
}

/**
 * Delete a specific backup by ID.
 */
export async function deleteBackup(backupId: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();

  const { error } = await supabase.from('backups').delete().eq('id', backupId);
  if (error) {
    return { success: false, message: 'فشل حذف النسخة الاحتياطية' };
  }

  return { success: true, message: 'تم حذف النسخة الاحتياطية' };
}

/**
 * Auto-cleanup: Keep only the last MAX_BACKUPS.
 * Deletes the oldest backups if there are more than MAX_BACKUPS.
 */
export async function cleanupOldBackups(maxBackups: number = MAX_BACKUPS): Promise<number> {
  await initializeDatabase();

  // Get all backup IDs ordered by creation date (newest first)
  const { data: allBackups } = await supabase
    .from('backups')
    .select('id, created_at')
    .order('created_at', { ascending: false });

  if (!allBackups || allBackups.length <= maxBackups) {
    return 0; // No cleanup needed
  }

  // Delete the oldest ones
  const idsToDelete = allBackups.slice(maxBackups).map(b => b.id);
  const { error } = await supabase.from('backups').delete().in('id', idsToDelete);

  if (error) {
    console.error('[Backup] ❌ Failed to cleanup old backups:', error);
    return 0;
  }

  console.log(`[Backup] 🧹 Cleaned up ${idsToDelete.length} old backups (keeping last ${maxBackups})`);
  return idsToDelete.length;
}

/**
 * Check if the backups table exists by trying to query it.
 */
export async function checkBackupsTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase.from('backups').select('id').limit(1);
    if (error) {
      // If error contains "does not exist" or "could not find", table doesn't exist
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('could not find') || msg.includes('relation') || msg.includes('schema cache')) {
        return false;
      }
      // Other errors (RLS, etc.) - table exists but access issue
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Export a specific backup as a downloadable JSON blob.
 */
export async function exportBackupAsJson(backupId: string): Promise<{ data: string | null; filename: string }> {
  const backup = await getBackupById(backupId);
  if (!backup) {
    return { data: null, filename: '' };
  }

  // Get full data
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase
      .from('backups')
      .select('data, record_counts, reason, created_at')
      .eq('id', backupId)
      .single();
    if (error) throw error;
    return data;
  });

  if (!result) {
    return { data: null, filename: '' };
  }

  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    backupId,
    backupReason: result.reason,
    backupCreatedAt: result.created_at,
    ...result.data,
  };

  const filename = `backup-${backupId}-${new Date(result.created_at).toISOString().split('T')[0]}.json`;
  return { data: JSON.stringify(exportData, null, 2), filename };
}

// ============================================
// Currency Exchange Functions
// ============================================

function calculateUsdValue(
  amount: number,
  exchangeRate: number,
  conversionMethod: 'MULTIPLY' | 'DIVIDE'
): number {
  if (conversionMethod === 'MULTIPLY') {
    return amount * exchangeRate;
  } else {
    return amount / exchangeRate;
  }
}

export async function getCurrencyExchanges(options?: { includeArchived?: boolean }): Promise<CurrencyExchange[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const includeArchived = options?.includeArchived ?? false;
  const result = await fetchWithRetry(async () => {
    let query = supabase.from('currency_exchanges').select('*');
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getCurrencyExchanges: failed after retries, returning []');
    return [];
  }
  return (result || [])
    .map(rowToCurrencyExchange)
    .filter(e => !e.isDeleted)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function getCurrencyExchangeById(id: string): Promise<CurrencyExchange | undefined> {
  await initializeDatabase();
  if (!tablesExist) return undefined;
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('currency_exchanges').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  });
  if (result === null) return undefined;
  return result ? rowToCurrencyExchange(result) : undefined;
}

export async function addCurrencyExchange(data: {
  outgoingCurrencyId: string;
  incomingCurrencyId: string;
  outgoingAmount: number;
  incomingAmount: number;
  description?: string;
  date: string;
}): Promise<CurrencyExchange> {
  await initializeDatabase();
  
  const now = new Date();
  
  // Fetch currency info at time of operation (SNAPSHOT)
  const { data: outgoingCurrencyRow } = await supabase.from('currencies').select('*').eq('id', data.outgoingCurrencyId).single();
  const { data: incomingCurrencyRow } = await supabase.from('currencies').select('*').eq('id', data.incomingCurrencyId).single();
  
  if (!outgoingCurrencyRow) throw new Error('العملة المصدر غير موجودة');
  if (!incomingCurrencyRow) throw new Error('العملة الهدف غير موجودة');
  
  const outgoingCurrency = rowToCurrency(outgoingCurrencyRow);
  const incomingCurrency = rowToCurrency(incomingCurrencyRow);
  
  // Check outgoing vault balance
  const { data: outgoingVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', data.outgoingCurrencyId);
  const outgoingVault = outgoingVaultRows && outgoingVaultRows.length > 0 ? rowToVault(outgoingVaultRows[0]) : null;
  
  if (outgoingVault && outgoingVault.balance < data.outgoingAmount) {
    throw new Error(`الرصيد غير كافٍ في صندوق ${outgoingCurrency.name}`);
  }
  
  // Save exchange rates at time of operation (SNAPSHOT)
  const outgoingRateAtTime = outgoingCurrency.exchangeRate;
  const incomingRateAtTime = incomingCurrency.exchangeRate;
  const outgoingConversionMethod = outgoingCurrency.conversionMethod || 'MULTIPLY';
  const incomingConversionMethod = incomingCurrency.conversionMethod || 'MULTIPLY';
  
  // Calculate USD values
  const outgoingUsd = calculateUsdValue(data.outgoingAmount, outgoingRateAtTime, outgoingConversionMethod);
  const incomingUsd = calculateUsdValue(data.incomingAmount, incomingRateAtTime, incomingConversionMethod);
  
  const profit = incomingUsd - outgoingUsd;
  
  const exchange: CurrencyExchange = {
    id: generateId(),
    outgoingCurrencyId: data.outgoingCurrencyId,
    incomingCurrencyId: data.incomingCurrencyId,
    outgoingAmount: data.outgoingAmount,
    incomingAmount: data.incomingAmount,
    outgoingRateAtTime,
    incomingRateAtTime,
    outgoingConversionMethod,
    incomingConversionMethod,
    outgoingUsd,
    incomingUsd,
    profit,
    description: data.description,
    date: new Date(data.date),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };
  
  const { error } = await supabase.from('currency_exchanges').insert([currencyExchangeToRow(exchange)]);
  if (error) throw new Error(error.message);

  // Recalculate vault balances for both currencies
  await recalculateVaultBalance(data.outgoingCurrencyId);
  await recalculateVaultBalance(data.incomingCurrencyId);
  
  return exchange;
}

export async function deleteCurrencyExchange(id: string): Promise<void> {
  await initializeDatabase();
  
  const { data: exchangeRow } = await supabase.from('currency_exchanges').select('*').eq('id', id).single();
  if (!exchangeRow) throw new Error('عملية الصرف غير موجودة');
  
  const exchange = rowToCurrencyExchange(exchangeRow);
  
  if (exchange.isDeleted) throw new Error('العملة محذوفة بالفعل');
  
  const now = new Date();
  
  // Soft delete
  const { error } = await supabase.from('currency_exchanges').update({
    is_deleted: true,
    updated_at: now.toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);

  // Recalculate vault balances for both currencies
  await recalculateVaultBalance(exchange.outgoingCurrencyId);
  await recalculateVaultBalance(exchange.incomingCurrencyId);
}

export async function getExchangeStats(): Promise<{
  totalExchanges: number;
  totalProfit: number;
  totalOutgoingUsd: number;
  totalIncomingUsd: number;
  profitCount: number;
  lossCount: number;
}> {
  await initializeDatabase();
  if (!tablesExist) {
    return { totalExchanges: 0, totalProfit: 0, totalOutgoingUsd: 0, totalIncomingUsd: 0, profitCount: 0, lossCount: 0 };
  }
  
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('currency_exchanges').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getExchangeStats: failed after retries, returning defaults');
    return { totalExchanges: 0, totalProfit: 0, totalOutgoingUsd: 0, totalIncomingUsd: 0, profitCount: 0, lossCount: 0 };
  }
  const exchanges = (result || []).map(rowToCurrencyExchange).filter(e => !e.isDeleted);
  
  const totalProfit = exchanges.reduce((sum, e) => sum + e.profit, 0);
  const totalOutgoingUsd = exchanges.reduce((sum, e) => sum + e.outgoingUsd, 0);
  const totalIncomingUsd = exchanges.reduce((sum, e) => sum + e.incomingUsd, 0);
  const profitCount = exchanges.filter(e => e.profit > 0).length;
  const lossCount = exchanges.filter(e => e.profit < 0).length;
  
  return {
    totalExchanges: exchanges.length,
    totalProfit,
    totalOutgoingUsd,
    totalIncomingUsd,
    profitCount,
    lossCount,
  };
}

// ============================================
// Compatibility aliases
// ============================================

export async function getExchanges(): Promise<CurrencyExchange[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('currency_exchanges').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getExchanges: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToCurrencyExchange).filter(e => !e.isDeleted);
}

export async function addExchange(data: {
  outgoingCurrencyId: string;
  incomingCurrencyId: string;
  outgoingAmount: number;
  incomingAmount: number;
  description?: string;
  date: string;
}): Promise<CurrencyExchange> {
  return addCurrencyExchange(data);
}

export async function deleteExchange(id: string): Promise<void> {
  return deleteCurrencyExchange(id);
}

// ============================================
// User Functions
// ============================================

function hashPassword(password: string): string {
  return btoa(password.split('').reverse().join(''));
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

export async function initializeDefaultUser(): Promise<User> {
  await initializeDatabase();
  
  const { data: userRows } = await supabase.from('users').select('*');
  
  if (!userRows || userRows.length === 0) {
    const now = new Date();
    const defaultUser: User = {
      id: 'user_default',
      username: 'admin',
      password: hashPassword('admin'),
      name: 'المدير',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await supabase.from('users').insert([userToRow(defaultUser)]);
    if (error) {
      // If role column doesn't exist yet, try inserting without role
      if (error.message && (error.message.includes('role') || error.message.includes('column'))) {
        const fallbackUser = { ...defaultUser };
        const row = userToRow(fallbackUser);
        delete row.role;
        const { error: err2 } = await supabase.from('users').insert([row]);
        if (err2) throw new Error(err2.message);
        return defaultUser;
      }
      throw new Error(error.message);
    }
    return defaultUser;
  }
  
  return rowToUser(userRows[0]);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  await initializeDatabase();
  if (!tablesExist) return undefined;
  const { data, error } = await supabase.from('users').select('*').eq('username', username);
  if (error || !data || data.length === 0) return undefined;
  return rowToUser(data[0]);
}

export async function getUsers(): Promise<User[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getUsers: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToUser);
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
  await initializeDatabase();
  await initializeDefaultUser();
  
  const user = await getUserByUsername(username);
  
  if (!user) {
    return { success: false, message: 'اسم المستخدم غير موجود' };
  }
  
  if (!verifyPassword(password, user.password)) {
    return { success: false, message: 'كلمة المرور غير صحيحة' };
  }
  
  return { success: true, user, message: 'تم تسجيل الدخول بنجاح' };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  
  if (!userRow) {
    return { success: false, message: 'المستخدم غير موجود' };
  }
  
  const user = rowToUser(userRow);
  
  if (!verifyPassword(oldPassword, user.password)) {
    return { success: false, message: 'كلمة المرور القديمة غير صحيحة' };
  }
  
  const { error } = await supabase.from('users').update({
    password: hashPassword(newPassword),
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) throw new Error(error.message);
  
  return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
}

export async function changeUsername(userId: string, newUsername: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  const existingUser = await getUserByUsername(newUsername);
  if (existingUser && existingUser.id !== userId) {
    return { success: false, message: 'اسم المستخدم موجود مسبقاً' };
  }
  
  const { error } = await supabase.from('users').update({
    username: newUsername,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) throw new Error(error.message);
  
  return { success: true, message: 'تم تغيير اسم المستخدم بنجاح' };
}

export async function updateUser(userId: string, data: { name?: string; role?: UserRole }): Promise<User | null> {
  await initializeDatabase();
  const { error } = await supabase.from('users').update({
    ...data,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow } = await supabase.from('users').select('*').eq('id', userId).single();
  return updatedRow ? rowToUser(updatedRow) : null;
}

export async function getUserById(userId: string): Promise<User | null> {
  await initializeDatabase();
  if (!tablesExist) return null;
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return rowToUser(data);
}

export async function createUser(userData: { username: string; password: string; name?: string; role?: UserRole }): Promise<{ success: boolean; user?: User; message: string }> {
  await initializeDatabase();
  
  // Check if username already exists
  const existing = await getUserByUsername(userData.username);
  if (existing) {
    return { success: false, message: 'اسم المستخدم موجود بالفعل' };
  }
  
  const now = new Date();
  const newUser: User = {
    id: 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9),
    username: userData.username,
    password: hashPassword(userData.password),
    name: userData.name || userData.username,
    role: userData.role || 'user',
    createdAt: now,
    updatedAt: now,
  };
  
  const row = userToRow(newUser);
  // Try inserting with role, fallback without if column doesn't exist
  const { error } = await supabase.from('users').insert([row]);
  if (error) {
    if (error.message && (error.message.includes('role') || error.message.includes('column'))) {
      const fallbackRow = { ...row };
      delete fallbackRow.role;
      const { error: err2 } = await supabase.from('users').insert([fallbackRow]);
      if (err2) return { success: false, message: err2.message };
      return { success: true, user: newUser, message: 'تم إنشاء المستخدم بنجاح' };
    }
    return { success: false, message: error.message };
  }
  
  return { success: true, user: newUser, message: 'تم إنشاء المستخدم بنجاح' };
}

export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  // Prevent deleting the last admin
  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!userRow) return { success: false, message: 'المستخدم غير موجود' };
  
  const user = rowToUser(userRow);
  if (user.role === 'admin') {
    // Check if this is the last admin
    const { data: allUsers } = await supabase.from('users').select('*');
    const admins = (allUsers || []).filter(u => (u as Record<string, unknown>).role === 'admin' || !(u as Record<string, unknown>).role);
    if (admins.length <= 1) {
      return { success: false, message: 'لا يمكن حذف آخر مدير في النظام' };
    }
  }
  
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'تم حذف المستخدم بنجاح' };
}

// ============================================
// Vehicle Functions
// ============================================

export async function getVehicles(): Promise<Vehicle[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getVehicles: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToVehicle).filter(v => v.isActive);
}

export async function addVehicle(data: {
  id: string;
  name: string;
  plateNumber?: string;
  notes?: string;
  isActive: boolean;
}): Promise<Vehicle> {
  await initializeDatabase();
  const now = new Date();
  
  const vehicle: Vehicle = {
    id: data.id,
    name: data.name,
    plateNumber: data.plateNumber,
    notes: data.notes,
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('vehicles').insert([vehicleToRow(vehicle)]);
  if (error) throw new Error(error.message);
  return vehicle;
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
  await initializeDatabase();
  const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const { error } = await supabase.from('vehicles').update(vehicleToRow(updateFields as Partial<Vehicle>)).eq('id', id);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow } = await supabase.from('vehicles').select('*').eq('id', id).single();
  return updatedRow ? rowToVehicle(updatedRow) : null;
}

export async function deleteVehicle(id: string): Promise<void> {
  await initializeDatabase();
  
  // Delete all vehicle transactions
  await supabase.from('vehicle_transactions').delete().eq('vehicle_id', id);
  
  // Delete vehicle
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================
// Vehicle Transaction Functions
// ============================================

export async function getVehicleTransactions(vehicleId: string): Promise<VehicleTransaction[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('vehicle_transactions').select('*').eq('vehicle_id', vehicleId);
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getVehicleTransactions: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToVehicleTransaction);
}

export async function addVehicleTransaction(data: {
  id: string;
  vehicleId: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
}): Promise<VehicleTransaction> {
  await initializeDatabase();
  const now = new Date();
  
  const transaction: VehicleTransaction = {
    id: data.id,
    vehicleId: data.vehicleId,
    date: data.date,
    amount: data.amount,
    partner: data.partner,
    paymentType: data.paymentType,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('vehicle_transactions').insert([vehicleTransactionToRow(transaction)]);
  if (error) throw new Error(error.message);
  return transaction;
}

export async function updateVehicleTransaction(id: string, data: Partial<VehicleTransaction>): Promise<VehicleTransaction | null> {
  await initializeDatabase();
  const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const { error } = await supabase.from('vehicle_transactions').update(vehicleTransactionToRow(updateFields as Partial<VehicleTransaction>)).eq('id', id);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow } = await supabase.from('vehicle_transactions').select('*').eq('id', id).single();
  return updatedRow ? rowToVehicleTransaction(updatedRow) : null;
}

export async function deleteVehicleTransaction(id: string): Promise<void> {
  await initializeDatabase();
  const { error } = await supabase.from('vehicle_transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================
// Shared Transaction Functions
// ============================================

export async function getSharedTransactions(): Promise<SharedTransaction[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('shared_transactions').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getSharedTransactions: failed after retries, returning []');
    return [];
  }
  return (result || []).map(rowToSharedTransaction);
}

export async function addSharedTransaction(data: {
  id: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
}): Promise<SharedTransaction> {
  await initializeDatabase();
  const now = new Date();
  
  const transaction: SharedTransaction = {
    id: data.id,
    date: data.date,
    amount: data.amount,
    partner: data.partner,
    paymentType: data.paymentType,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  };
  
  const { error } = await supabase.from('shared_transactions').insert([sharedTransactionToRow(transaction)]);
  if (error) throw new Error(error.message);
  return transaction;
}

export async function updateSharedTransaction(id: string, data: Partial<SharedTransaction>): Promise<SharedTransaction | null> {
  await initializeDatabase();
  const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const { error } = await supabase.from('shared_transactions').update(sharedTransactionToRow(updateFields as Partial<SharedTransaction>)).eq('id', id);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow } = await supabase.from('shared_transactions').select('*').eq('id', id).single();
  return updatedRow ? rowToSharedTransaction(updatedRow) : null;
}

export async function deleteSharedTransaction(id: string): Promise<void> {
  await initializeDatabase();
  const { error } = await supabase.from('shared_transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================
// Vehicles Settings Functions
// ============================================

export async function getVehiclesSettings(): Promise<VehiclesSettings | null> {
  await initializeDatabase();
  if (!tablesExist) return null;
  const result = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('vehicles_settings').select('*');
    if (error) throw error;
    return data;
  });
  if (result === null) {
    console.error('[Supabase] ❌ getVehiclesSettings: failed after retries, returning null');
    return null;
  }
  const settings = (result || []).map(rowToVehiclesSettings);
  return settings.length > 0 ? settings[0] : null;
}

export async function saveVehiclesSettings(data: {
  firstPartnerName: string;
  secondPartnerName: string;
}): Promise<VehiclesSettings> {
  await initializeDatabase();
  const now = new Date();
  
  const existingSettings = await getVehiclesSettings();
  
  if (existingSettings) {
    const { error } = await supabase.from('vehicles_settings').update({
      first_partner_name: data.firstPartnerName,
      second_partner_name: data.secondPartnerName,
      updated_at: now.toISOString(),
    }).eq('id', existingSettings.id);
    if (error) throw new Error(error.message);
    
    const { data: updatedRow } = await supabase.from('vehicles_settings').select('*').eq('id', existingSettings.id).single();
    return rowToVehiclesSettings(updatedRow!);
  } else {
    const newSettings: VehiclesSettings = {
      id: 'vehicles_settings_1',
      firstPartnerName: data.firstPartnerName,
      secondPartnerName: data.secondPartnerName,
      updatedAt: now,
    };
    const { error } = await supabase.from('vehicles_settings').insert([vehiclesSettingsToRow(newSettings)]);
    if (error) throw new Error(error.message);
    return newSettings;
  }
}

// ============================================
// Additional Compatibility Functions
// ============================================

export async function addAccountDebtPayment(data: {
  debtId: string;
  amount: number;
  note?: string;
  date: string;
}): Promise<DebtPayment> {
  const { data: debtRow } = await supabase.from('debts').select('*').eq('id', data.debtId).single();
  if (!debtRow) throw new Error('الدين غير موجود');
  
  const debt = rowToDebt(debtRow);
  
  return addDebtPayment({
    debtId: data.debtId,
    amount: data.amount,
    currencyId: debt.currencyId,
    description: data.note,
    date: data.date,
  });
}

export async function getAccountDebtPayments(accountId: string): Promise<DebtPayment[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const debtResult = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('debts').select('*').eq('account_id', accountId);
    if (error) throw error;
    return data;
  });
  if (debtResult === null) {
    console.error('[Supabase] ❌ getAccountDebtPayments: failed to fetch debts, returning []');
    return [];
  }
  const accountDebts = (debtResult || []).map(rowToDebt);
  const debtIds = accountDebts.map(d => d.id);
  
  if (debtIds.length === 0) return [];
  
  const paymentResult = await fetchWithRetry(async () => {
    const { data, error } = await supabase.from('debt_payments').select('*').in('debt_id', debtIds);
    if (error) throw error;
    return data;
  });
  if (paymentResult === null) {
    console.error('[Supabase] ❌ getAccountDebtPayments: failed to fetch payments, returning []');
    return [];
  }
  return (paymentResult || []).map(rowToDebtPayment);
}

export async function updateCurrencyExchangeRateWithMethod(
  currencyId: string,
  rate: number,
  conversionMethod?: 'MULTIPLY' | 'DIVIDE'
): Promise<Currency> {
  await initializeDatabase();
  const updateData: Record<string, unknown> = {
    exchange_rate: rate,
    updated_at: new Date().toISOString(),
  };
  if (conversionMethod) {
    updateData.conversion_method = conversionMethod;
  }
  const { error } = await supabase.from('currencies').update(updateData).eq('id', currencyId);
  if (error) throw new Error(error.message);
  
  const { data, error: refetchError } = await supabase.from('currencies').select('*').eq('id', currencyId).single();
  if (refetchError) throw new Error(refetchError.message);
  return rowToCurrency(data);
}

// ============================================
// Download / Import from File Functions
// ============================================

export async function downloadDataAsJson(): Promise<void> {
  await initializeDatabase();
  const data: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    currencies: await getAllAvailableCurrencies(),
    vaults: await getVaults(),
    accounts: (await supabase.from('accounts').select('*')).data?.map(rowToAccount) || [],
    transactions: (await supabase.from('transactions').select('*')).data?.map(rowToTransaction) || [],
    debts: (await supabase.from('debts').select('*')).data?.map(rowToDebt) || [],
    debtPayments: (await supabase.from('debt_payments').select('*')).data?.map(rowToDebtPayment) || [],
    currencyExchanges: (await supabase.from('currency_exchanges').select('*')).data?.map(rowToCurrencyExchange) || [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exchange-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importDataFromFile(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;
    
    await initializeDatabase();
    
    if (data.currencies) {
      await supabase.from('currencies').delete().neq('id', '__never_match__');
      const rows = data.currencies.map(c => currencyToRow({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) }));
      if (rows.length > 0) await supabase.from('currencies').insert(rows);
    }
    if (data.vaults) {
      await supabase.from('vaults').delete().neq('id', '__never_match__');
      const rows = data.vaults.map(v => vaultToRow({ ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) }));
      if (rows.length > 0) await supabase.from('vaults').insert(rows);
    }
    if (data.accounts) {
      await supabase.from('accounts').delete().neq('id', '__never_match__');
      const rows = data.accounts.map(a => accountToRow({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) }));
      if (rows.length > 0) await supabase.from('accounts').insert(rows);
    }
    if (data.transactions) {
      await supabase.from('transactions').delete().neq('id', '__never_match__');
      const rows = data.transactions.map(t => transactionToRow({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt), updatedAt: new Date(t.updatedAt) }));
      if (rows.length > 0) await supabase.from('transactions').insert(rows);
    }
    if (data.debts) {
      await supabase.from('debts').delete().neq('id', '__never_match__');
      const rows = data.debts.map(d => debtToRow({ ...d, date: new Date(d.date), createdAt: new Date(d.createdAt), updatedAt: new Date(d.updatedAt) }));
      if (rows.length > 0) await supabase.from('debts').insert(rows);
    }
    if (data.debtPayments) {
      await supabase.from('debt_payments').delete().neq('id', '__never_match__');
      const rows = data.debtPayments.map(p => debtPaymentToRow({ ...p, date: new Date(p.date), createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) }));
      if (rows.length > 0) await supabase.from('debt_payments').insert(rows);
    }
    if (data.currencyExchanges) {
      await supabase.from('currency_exchanges').delete().neq('id', '__never_match__');
      const rows = data.currencyExchanges.map(e => currencyExchangeToRow({ ...e, date: new Date(e.date), createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) }));
      if (rows.length > 0) await supabase.from('currency_exchanges').insert(rows);
    }
    
    return { success: true, message: "تم استيراد البيانات بنجاح" };
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, message: "حدث خطأ أثناء استيراد البيانات" };
  }
}

export async function restoreFromBackup(data: ExportData): Promise<{ success: boolean; message: string }> {
  return importDataFromFile(new File([JSON.stringify(data)], "backup.json"));
}

export async function getDataStats(): Promise<{
  currencies: number;
  vaults: number;
  accounts: number;
  transactions: number;
  debts: number;
  debtPayments: number;
  currencyExchanges: number;
}> {
  const defaultStats = { currencies: 0, vaults: 0, accounts: 0, transactions: 0, debts: 0, debtPayments: 0, currencyExchanges: 0 };
  await initializeDatabase();
  if (!tablesExist) return defaultStats;
  
  const result = await fetchWithRetry(async () => {
    const [curRes, vRes, aRes, tRes, dRes, dpRes, ceRes] = await Promise.all([
      supabase.from('currencies').select('id', { count: 'exact', head: true }),
      supabase.from('vaults').select('id', { count: 'exact', head: true }),
      supabase.from('accounts').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('debts').select('id', { count: 'exact', head: true }),
      supabase.from('debt_payments').select('id', { count: 'exact', head: true }),
      supabase.from('currency_exchanges').select('id', { count: 'exact', head: true }),
    ]);
    return { curRes, vRes, aRes, tRes, dRes, dpRes, ceRes };
  });
  if (result === null) {
    console.error('[Supabase] ❌ getDataStats: failed after retries, returning defaults');
    return defaultStats;
  }
  
  return {
    currencies: result.curRes.count || 0,
    vaults: result.vRes.count || 0,
    accounts: result.aRes.count || 0,
    transactions: result.tRes.count || 0,
    debts: result.dRes.count || 0,
    debtPayments: result.dpRes.count || 0,
    currencyExchanges: result.ceRes.count || 0,
  };
}

// ============================================
// Archive Functions
// ============================================

export async function archiveRecords(table: 'transactions' | 'debts' | 'debt_payments' | 'currency_exchanges', ids: string[]): Promise<void> {
  await initializeDatabase();
  if (ids.length === 0) return;
  const { error } = await supabase.from(table).update({ is_archived: true, updated_at: new Date().toISOString() }).in('id', ids);
  if (error) throw new Error(error.message);
}

export async function unarchiveRecords(table: 'transactions' | 'debts' | 'debt_payments' | 'currency_exchanges', ids: string[]): Promise<void> {
  await initializeDatabase();
  if (ids.length === 0) return;
  const { error } = await supabase.from(table).update({ is_archived: false, updated_at: new Date().toISOString() }).in('id', ids);
  if (error) throw new Error(error.message);
}

export async function autoArchiveOldRecords(monthsThreshold: number = 6): Promise<{ archived: { transactions: number; debts: number; debtPayments: number; currencyExchanges: number } }> {
  await initializeDatabase();
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - monthsThreshold);
  const thresholdIso = thresholdDate.toISOString();
  
  const result = { archived: { transactions: 0, debts: 0, debtPayments: 0, currencyExchanges: 0 } };
  
  // Archive old transactions (not already archived)
  const { data: oldTx } = await supabase.from('transactions').select('id').lt('date', thresholdIso).eq('is_archived', false);
  if (oldTx && oldTx.length > 0) {
    const ids = oldTx.map(r => r.id);
    await archiveRecords('transactions', ids);
    result.archived.transactions = ids.length;
  }
  
  // Archive old debts (not already archived, only paid ones)
  const { data: oldDebts } = await supabase.from('debts').select('id').lt('date', thresholdIso).eq('is_archived', false).eq('is_paid', true);
  if (oldDebts && oldDebts.length > 0) {
    const ids = oldDebts.map(r => r.id);
    await archiveRecords('debts', ids);
    result.archived.debts = ids.length;
  }
  
  // Archive old debt payments (not already archived)
  const { data: oldPayments } = await supabase.from('debt_payments').select('id').lt('date', thresholdIso).eq('is_archived', false);
  if (oldPayments && oldPayments.length > 0) {
    const ids = oldPayments.map(r => r.id);
    await archiveRecords('debt_payments', ids);
    result.archived.debtPayments = ids.length;
  }
  
  // Archive old currency exchanges (not already archived, not soft-deleted)
  const { data: oldExchanges } = await supabase.from('currency_exchanges').select('id').lt('date', thresholdIso).eq('is_archived', false).eq('is_deleted', false);
  if (oldExchanges && oldExchanges.length > 0) {
    const ids = oldExchanges.map(r => r.id);
    await archiveRecords('currency_exchanges', ids);
    result.archived.currencyExchanges = ids.length;
  }
  
  return result;
}

export async function getArchivedCounts(): Promise<{ transactions: number; debts: number; debtPayments: number; currencyExchanges: number }> {
  const defaultCounts = { transactions: 0, debts: 0, debtPayments: 0, currencyExchanges: 0 };
  await initializeDatabase();
  const result = await fetchWithRetry(async () => {
    const [txResult, debtResult, paymentResult, exchangeResult] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('is_archived', true),
      supabase.from('debts').select('id', { count: 'exact', head: true }).eq('is_archived', true),
      supabase.from('debt_payments').select('id', { count: 'exact', head: true }).eq('is_archived', true),
      supabase.from('currency_exchanges').select('id', { count: 'exact', head: true }).eq('is_archived', true).eq('is_deleted', false),
    ]);
    return { txResult, debtResult, paymentResult, exchangeResult };
  });
  if (result === null) {
    console.error('[Supabase] ❌ getArchivedCounts: failed after retries, returning defaults');
    return defaultCounts;
  }
  
  return {
    transactions: result.txResult.count || 0,
    debts: result.debtResult.count || 0,
    debtPayments: result.paymentResult.count || 0,
    currencyExchanges: result.exchangeResult.count || 0,
  };
}

// ============================================
// 🔸 Archive Viewer: Lazy-load archived data with filters
// 🔸 Only loads when user opens the archive modal
// 🔸 Supports date, account, currency filtering + pagination
// ============================================

export interface ArchiveFilters {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  currencyId?: string;
  page?: number;
  pageSize?: number;
}

export interface ArchiveDataResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getArchivedTransactions(filters: ArchiveFilters = {}): Promise<ArchiveDataResult<Transaction>> {
  await initializeDatabase();
  if (!tablesExist) return { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

  const { dateFrom, dateTo, accountId, currencyId, page = 1, pageSize = 50 } = filters;

  const result = await fetchWithRetry(async () => {
    let query = supabase.from('transactions')
      .select('*', { count: 'exact' })
      .eq('is_archived', true)
      .order('date', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (accountId) query = query.eq('account_id', accountId);
    if (currencyId) query = query.eq('currency_id', currencyId);

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  });

  if (result === null) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  return {
    data: (result.data || []).map(rowToTransaction),
    total: result.count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((result.count || 0) / pageSize),
  };
}

export async function getArchivedDebts(filters: ArchiveFilters = {}): Promise<ArchiveDataResult<Debt>> {
  await initializeDatabase();
  if (!tablesExist) return { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

  const { dateFrom, dateTo, accountId, currencyId, page = 1, pageSize = 50 } = filters;

  const result = await fetchWithRetry(async () => {
    let query = supabase.from('debts')
      .select('*', { count: 'exact' })
      .eq('is_archived', true)
      .order('date', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (accountId) query = query.eq('account_id', accountId);
    if (currencyId) query = query.eq('currency_id', currencyId);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  });

  if (result === null) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  return {
    data: (result.data || []).map(rowToDebt),
    total: result.count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((result.count || 0) / pageSize),
  };
}

export async function getArchivedDebtPayments(filters: ArchiveFilters = {}): Promise<ArchiveDataResult<DebtPayment>> {
  await initializeDatabase();
  if (!tablesExist) return { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

  const { dateFrom, dateTo, currencyId, page = 1, pageSize = 50 } = filters;

  const result = await fetchWithRetry(async () => {
    let query = supabase.from('debt_payments')
      .select('*', { count: 'exact' })
      .eq('is_archived', true)
      .order('date', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (currencyId) query = query.eq('currency_id', currencyId);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  });

  if (result === null) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  return {
    data: (result.data || []).map(rowToDebtPayment),
    total: result.count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((result.count || 0) / pageSize),
  };
}

export async function getArchivedCurrencyExchanges(filters: ArchiveFilters = {}): Promise<ArchiveDataResult<CurrencyExchange>> {
  await initializeDatabase();
  if (!tablesExist) return { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

  const { dateFrom, dateTo, currencyId, page = 1, pageSize = 50 } = filters;

  const result = await fetchWithRetry(async () => {
    let query = supabase.from('currency_exchanges')
      .select('*', { count: 'exact' })
      .eq('is_archived', true)
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (currencyId) {
      query = query.or(`outgoing_currency_id.eq.${currencyId},incoming_currency_id.eq.${currencyId}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  });

  if (result === null) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  return {
    data: (result.data || []).map(rowToCurrencyExchange),
    total: result.count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((result.count || 0) / pageSize),
  };
}

// ============================================
// 🔸 Export all archived data as JSON
// ============================================

export async function exportArchivedData(): Promise<{
  version: string;
  exportedAt: string;
  type: 'archive';
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  currencyExchanges: CurrencyExchange[];
}> {
  await initializeDatabase();
  if (!tablesExist) {
    return { version: '1.0', exportedAt: new Date().toISOString(), type: 'archive', transactions: [], debts: [], debtPayments: [], currencyExchanges: [] };
  }

  // Load ALL archived data (no pagination)
  const [txResult, debtResult, paymentResult, exchangeResult] = await Promise.all([
    fetchWithRetry(async () => {
      const { data, error } = await supabase.from('transactions').select('*').eq('is_archived', true);
      if (error) throw error;
      return data;
    }),
    fetchWithRetry(async () => {
      const { data, error } = await supabase.from('debts').select('*').eq('is_archived', true);
      if (error) throw error;
      return data;
    }),
    fetchWithRetry(async () => {
      const { data, error } = await supabase.from('debt_payments').select('*').eq('is_archived', true);
      if (error) throw error;
      return data;
    }),
    fetchWithRetry(async () => {
      const { data, error } = await supabase.from('currency_exchanges').select('*').eq('is_archived', true).eq('is_deleted', false);
      if (error) throw error;
      return data;
    }),
  ]);

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    type: 'archive',
    transactions: (txResult || []).map(rowToTransaction),
    debts: (debtResult || []).map(rowToDebt),
    debtPayments: (paymentResult || []).map(rowToDebtPayment),
    currencyExchanges: (exchangeResult || []).map(rowToCurrencyExchange),
  };
}

// ============================================
// 🔸 Restore specific archived records to active
// ============================================

export async function restoreArchivedRecords(
  table: 'transactions' | 'debts' | 'debt_payments' | 'currency_exchanges',
  ids: string[]
): Promise<void> {
  // This is the same as unarchiveRecords — sets is_archived = false
  await unarchiveRecords(table, ids);
}
