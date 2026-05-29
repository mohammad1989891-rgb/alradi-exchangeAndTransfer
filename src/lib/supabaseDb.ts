import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
}

export interface User {
  id: string;
  username: string;
  password: string;
  name?: string;
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
    const { data, error, status } = await supabase.from('currencies').select('id').limit(1);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      console.error('[Supabase] ❌ checkTablesExist error:', { message: error.message, code: error.code, status, hint: error.hint });

      // These messages mean the table doesn't exist at all
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

      // RLS or auth errors mean tables exist but access is denied
      // This is a different problem — don't mark tables as missing
      if (msg.includes('policy') || msg.includes('permission') || msg.includes('jwt') || msg.includes('rls') || msg.includes('new row violates')) {
        console.error('[Supabase] ⚠️ Tables EXIST but RLS blocks access — FIX: Run fix-rls.sql in Supabase SQL Editor');
        console.error('[Supabase] 💡 fix-rls.sql is located in: supabase/fix-rls.sql');
        tablesExist = true; // Tables exist, just can't access them
        return true;
      }

      // For other errors (network, timeout, etc.) — assume tables might exist
      // Don't block the app, let it retry
      console.warn('[Supabase] ⚠️ Unknown error, assuming tables exist:', msg);
      tablesExist = true;
      return true;
    }

    // Success — tables exist
    console.log('[Supabase] ✅ Tables exist, currencies count:', data?.length ?? 0);
    tablesExist = true;
    return true;
  } catch (err) {
    console.error('[Supabase] ❌ checkTablesExist exception:', err);
    // Network errors shouldn't block the app — assume tables exist and retry later
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
  const { data, error } = await supabase.from('currencies').select('*');
  if (error) {
    console.error('[Supabase] ❌ getAllAvailableCurrencies error:', error.message, error.code);
    throw new Error(error.message);
  }
  console.log('[Supabase] 📊 Currencies loaded:', data?.length ?? 0);
  return (data || []).map(rowToCurrency);
}

export async function getActiveCurrencies(): Promise<Currency[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const { data, error } = await supabase.from('currencies').select('*');
  if (error) {
    console.error('[Supabase] ❌ getActiveCurrencies error:', error.message, error.code);
    throw new Error(error.message);
  }
  const active = (data || []).map(rowToCurrency).filter(c => c.isActive);
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
  const { data, error } = await supabase.from('vaults').select('*');
  if (error) {
    console.error('[Supabase] ❌ getVaults error:', error.message, error.code);
    throw new Error(error.message);
  }
  console.log('[Supabase] 📊 Vaults loaded:', data?.length ?? 0);
  return (data || []).map(rowToVault);
}

export async function updateVaultBalance(currencyId: string, balanceDelta: number): Promise<Vault | null> {
  await initializeDatabase();
  
  const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', currencyId);
  if (vaultRows && vaultRows.length > 0) {
    const vault = rowToVault(vaultRows[0]);
    const newBalance = vault.balance + balanceDelta;
    const { error } = await supabase.from('vaults').update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }).eq('id', vault.id);
    if (error) throw new Error(error.message);
    
    const { data: updatedRow } = await supabase.from('vaults').select('*').eq('id', vault.id).single();
    return updatedRow ? rowToVault(updatedRow) : null;
  }
  return null;
}

export async function updateVaultOpeningBalance(currencyId: string, openingBalance: number): Promise<Vault | null> {
  await initializeDatabase();
  
  const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', currencyId);
  if (vaultRows && vaultRows.length > 0) {
    const vault = rowToVault(vaultRows[0]);
    const diff = openingBalance - (vault.openingBalance || 0);
    const { error } = await supabase.from('vaults').update({
      opening_balance: openingBalance,
      balance: vault.balance + diff,
      updated_at: new Date().toISOString(),
    }).eq('id', vault.id);
    if (error) throw new Error(error.message);
    
    const { data: updatedRow } = await supabase.from('vaults').select('*').eq('id', vault.id).single();
    return updatedRow ? rowToVault(updatedRow) : null;
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
  const { data, error } = await supabase.from('accounts').select('*');
  if (error) {
    console.error('[Supabase] ❌ getAccounts error:', error.message, error.code);
    throw new Error(error.message);
  }
  const active = (data || []).map(rowToAccount).filter(a => a.isActive);
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

export async function getTransactions(limit = 100): Promise<Transaction[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false }).limit(limit);
  if (error) {
    console.error('[Supabase] ❌ getTransactions error:', error.message, error.code);
    throw new Error(error.message);
  }
  console.log('[Supabase] 📊 Transactions loaded:', data?.length ?? 0);
  return (data || []).map(rowToTransaction);
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
}): Promise<Transaction> {
  await initializeDatabase();
  const now = new Date();
  
  const effectiveFactor = data.conversionFactor ?? 1;
  const finalBalance = calculateFinalBalance(
    data.amount || 0,
    effectiveFactor,
    data.conversionMethod || 'MULTIPLY',
    data.feesType || 'FIXED',
    data.feesAmount || 0,
    data.feesDirection || 'INCOME',
    data.type
  );
  
  const isDataComplete = !!(effectiveFactor && effectiveFactor !== 0
    && data.amount && data.amount !== 0
    && finalBalance && finalBalance !== 0);
  const isComplete = data.isComplete !== undefined ? data.isComplete : isDataComplete;
  
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
  
  // Update vault for complete cash transactions
  if (isComplete && data.paymentType === 'CASH') {
    const vaultCurrencyId = data.baseCurrencyId || data.currencyId;
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', vaultCurrencyId);
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      const newBalance = data.type === 'INCOME' ? vault.balance - data.amount : vault.balance + data.amount;
      await supabase.from('vaults').update({
        balance: newBalance,
        updated_at: now.toISOString(),
      }).eq('id', vault.id);
    }
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
  
  // Reverse old vault effect if old was complete and cash
  if (oldIsComplete && old.paymentType === 'CASH') {
    const oldVaultCurrencyId = old.baseCurrencyId || old.currencyId;
    const { data: oldVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', oldVaultCurrencyId);
    if (oldVaultRows && oldVaultRows.length > 0) {
      const oldVault = rowToVault(oldVaultRows[0]);
      const reversed = old.type === 'INCOME' ? oldVault.balance + old.amount : oldVault.balance - old.amount;
      await supabase.from('vaults').update({
        balance: reversed,
        updated_at: now.toISOString(),
      }).eq('id', oldVault.id);
    }
  }
  
  const finalBalance = calculateFinalBalance(
    effectiveAmount,
    effectiveConversionFactor,
    effectiveConversionMethod,
    effectiveFeesType,
    effectiveFeesAmount,
    effectiveFeesDirection,
    effectiveType
  );
  
  const isDataComplete = effectiveAmount > 0 && effectiveConversionFactor > 0 && finalBalance > 0;
  const newIsComplete = data.isComplete !== undefined
    ? (isDataComplete && data.isComplete)
    : isDataComplete;
  
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
  
  // Apply new vault effect if new is complete and cash
  if (newIsComplete && effectivePaymentType === 'CASH') {
    const vaultCurrencyId = (data.baseCurrencyId ?? data.currencyId) ?? (old.baseCurrencyId || old.currencyId);
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', vaultCurrencyId);
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      const newBalance = effectiveType === 'INCOME' ? vault.balance - effectiveAmount : vault.balance + effectiveAmount;
      await supabase.from('vaults').update({
        balance: newBalance,
        updated_at: now.toISOString(),
      }).eq('id', vault.id);
    }
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
  
  // Reverse vault effect for complete cash transactions
  if ((transaction.isComplete !== false) && transaction.paymentType === 'CASH') {
    const vaultCurrencyId = transaction.isOverflowTransaction
      ? transaction.currencyId
      : (transaction.baseCurrencyId || transaction.currencyId);
    
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', vaultCurrencyId);
    
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      let newBalance = vault.balance;
      
      if (transaction.type === 'INCOME') {
        newBalance = vault.balance + transaction.amount;
      } else {
        newBalance = vault.balance - transaction.amount;
      }
      
      await supabase.from('vaults').update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('id', vault.id);
    }
  }
  
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
}

// ============================================
// Debt Functions
// ============================================

export async function getDebts(limit = 100): Promise<Debt[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const { data, error } = await supabase.from('debts').select('*').order('date', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map(rowToDebt);
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
  
  // Vault effect for CASH debts
  if (debtMode === 'CASH') {
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', data.currencyId);
    
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      let newBalance = vault.balance;
      
      if (debtType === 'PAYABLE') {
        newBalance = vault.balance + data.amount;
      } else {
        newBalance = vault.balance - data.amount;
      }
      
      await supabase.from('vaults').update({
        balance: newBalance,
        updated_at: now.toISOString(),
      }).eq('id', vault.id);
    }
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

export async function deleteDebt(id: string): Promise<void> {
  await initializeDatabase();
  
  const { data: debtRow } = await supabase.from('debts').select('*').eq('id', id).single();
  if (!debtRow) throw new Error('الدين غير موجود');
  
  const debt = rowToDebt(debtRow);
  
  // Reverse vault effect for CASH debts
  if (debt.debtMode === 'CASH') {
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', debt.currencyId);
    
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      let newBalance = vault.balance;
      
      if (debt.debtType === 'PAYABLE') {
        newBalance = vault.balance - debt.amount;
      } else {
        newBalance = vault.balance + debt.amount;
      }
      
      await supabase.from('vaults').update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('id', vault.id);
    }
  }
  
  // Process related payments
  const { data: paymentRows } = await supabase.from('debt_payments').select('*').eq('debt_id', id);
  const payments = (paymentRows || []).map(rowToDebtPayment);
  
  for (const payment of payments) {
    const paymentMode = payment.paymentMode || 'CASH';
    const paymentDirection = payment.paymentDirection || debt.debtType || 'RECEIVABLE';
    
    if (paymentMode === 'CASH') {
      const { data: paymentVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', payment.currencyId);
      
      if (paymentVaultRows && paymentVaultRows.length > 0) {
        const paymentVault = rowToVault(paymentVaultRows[0]);
        let newPaymentBalance = paymentVault.balance;
        
        if (paymentDirection === 'RECEIVABLE') {
          newPaymentBalance = paymentVault.balance + payment.amount;
        } else {
          newPaymentBalance = paymentVault.balance - payment.amount;
        }
        
        await supabase.from('vaults').update({
          balance: newPaymentBalance,
          updated_at: new Date().toISOString(),
        }).eq('id', paymentVault.id);
      }
    }
    
    // Handle overflow transaction linked to payment
    if (payment.overflowTransactionId) {
      const { data: overflowRow } = await supabase.from('transactions').select('*').eq('id', payment.overflowTransactionId).single();
      
      if (overflowRow) {
        const overflowTransaction = rowToTransaction(overflowRow);
        
        if (overflowTransaction.paymentType === 'CASH') {
          const { data: overflowVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', overflowTransaction.currencyId);
          
          if (overflowVaultRows && overflowVaultRows.length > 0) {
            const overflowVault = rowToVault(overflowVaultRows[0]);
            let newOverflowBalance = overflowVault.balance;
            
            if (overflowTransaction.type === 'INCOME') {
              newOverflowBalance = overflowVault.balance + overflowTransaction.amount;
            } else {
              newOverflowBalance = overflowVault.balance - overflowTransaction.amount;
            }
            
            await supabase.from('vaults').update({
              balance: newOverflowBalance,
              updated_at: new Date().toISOString(),
            }).eq('id', overflowVault.id);
          }
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
}

// ============================================
// Debt Payment Functions
// ============================================

export async function getDebtPayments(debtId?: string): Promise<DebtPayment[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  if (debtId) {
    const { data, error } = await supabase.from('debt_payments').select('*').eq('debt_id', debtId);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToDebtPayment);
  }
  const { data, error } = await supabase.from('debt_payments').select('*').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToDebtPayment);
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
  
  // Vault effect for CASH payments
  if (paymentMode === 'CASH') {
    const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', data.currencyId);
    
    if (vaultRows && vaultRows.length > 0) {
      const vault = rowToVault(vaultRows[0]);
      let newVaultBalance = vault.balance;
      
      if (data.currentBalance !== undefined) {
        if (data.currentBalance < 0) {
          newVaultBalance = vault.balance - data.amount;
        } else {
          newVaultBalance = vault.balance + data.amount;
        }
      } else {
        if (paymentDirection === 'RECEIVABLE') {
          newVaultBalance = vault.balance - data.amount;
        } else {
          newVaultBalance = vault.balance + data.amount;
        }
      }
      
      await supabase.from('vaults').update({
        balance: newVaultBalance,
        updated_at: now.toISOString(),
      }).eq('id', vault.id);
    }
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
  
  if (debt) {
    const paymentMode = payment.paymentMode || 'CASH';
    const paymentDirection = payment.paymentDirection || debt.debtType || 'RECEIVABLE';
    
    if (paymentMode === 'CASH') {
      const { data: vaultRows } = await supabase.from('vaults').select('*').eq('currency_id', payment.currencyId);
      
      if (vaultRows && vaultRows.length > 0) {
        const vault = rowToVault(vaultRows[0]);
        let newBalance = vault.balance;
        
        if (paymentDirection === 'RECEIVABLE') {
          newBalance = vault.balance + payment.amount;
        } else {
          newBalance = vault.balance - payment.amount;
        }
        
        await supabase.from('vaults').update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        }).eq('id', vault.id);
      }
    }
    
    // Handle overflow transaction
    if (payment.overflowTransactionId) {
      const { data: overflowRow } = await supabase.from('transactions').select('*').eq('id', payment.overflowTransactionId).single();
      if (overflowRow) {
        const overflowTransaction = rowToTransaction(overflowRow);
        
        if (overflowTransaction.paymentType === 'CASH') {
          const { data: overflowVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', overflowTransaction.currencyId);
          
          if (overflowVaultRows && overflowVaultRows.length > 0) {
            const overflowVault = rowToVault(overflowVaultRows[0]);
            let newOverflowBalance = overflowVault.balance;
            
            if (overflowTransaction.type === 'INCOME') {
              newOverflowBalance = overflowVault.balance - overflowTransaction.amount;
            } else {
              newOverflowBalance = overflowVault.balance + overflowTransaction.amount;
            }
            
            await supabase.from('vaults').update({
              balance: newOverflowBalance,
              updated_at: new Date().toISOString(),
            }).eq('id', overflowVault.id);
          }
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
  
  const receivableDebts = allDebts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
  const payableDebts = allDebts.filter(d => d.debtType === 'PAYABLE');
  
  const totalReceivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalPayable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  const paymentsByDebt = new Map<string, number>();
  for (const payment of allPayments) {
    const current = paymentsByDebt.get(payment.debtId) || 0;
    paymentsByDebt.set(payment.debtId, current + payment.amount);
  }
  
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
    
    return { success: true, message: 'تم استيراد البيانات بنجاح' };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, message: 'حدث خطأ أثناء استيراد البيانات' };
  }
}

export async function clearAllData(): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  try {
    // Delete transactions
    await supabase.from('transactions').delete().neq('id', '__never_match__');
    
    // Delete debts and payments
    await supabase.from('debt_payments').delete().neq('id', '__never_match__');
    await supabase.from('debts').delete().neq('id', '__never_match__');
    
    // Delete currency exchanges
    await supabase.from('currency_exchanges').delete().neq('id', '__never_match__');
    
    // Reset vault balances to opening balance
    const { data: vaultRows } = await supabase.from('vaults').select('*');
    const vaults = (vaultRows || []).map(rowToVault);
    for (const vault of vaults) {
      await supabase.from('vaults').update({
        balance: vault.openingBalance || 0,
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

export async function getCurrencyExchanges(limit = 100): Promise<CurrencyExchange[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const { data, error } = await supabase.from('currency_exchanges').select('*');
  if (error) throw new Error(error.message);
  return (data || [])
    .map(rowToCurrencyExchange)
    .filter(e => !e.isDeleted)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}

export async function getCurrencyExchangeById(id: string): Promise<CurrencyExchange | undefined> {
  await initializeDatabase();
  if (!tablesExist) return undefined;
  const { data, error } = await supabase.from('currency_exchanges').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToCurrencyExchange(data);
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
  
  // Update vault balances
  if (outgoingVault) {
    await supabase.from('vaults').update({
      balance: outgoingVault.balance - data.outgoingAmount,
      updated_at: now.toISOString(),
    }).eq('id', outgoingVault.id);
  }
  
  const { data: incomingVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', data.incomingCurrencyId);
  const incomingVault = incomingVaultRows && incomingVaultRows.length > 0 ? rowToVault(incomingVaultRows[0]) : null;
  
  if (incomingVault) {
    await supabase.from('vaults').update({
      balance: incomingVault.balance + data.incomingAmount,
      updated_at: now.toISOString(),
    }).eq('id', incomingVault.id);
  }
  
  return exchange;
}

export async function deleteCurrencyExchange(id: string): Promise<void> {
  await initializeDatabase();
  
  const { data: exchangeRow } = await supabase.from('currency_exchanges').select('*').eq('id', id).single();
  if (!exchangeRow) throw new Error('عملية الصرف غير موجودة');
  
  const exchange = rowToCurrencyExchange(exchangeRow);
  
  if (exchange.isDeleted) throw new Error('العملة محذوفة بالفعل');
  
  const now = new Date();
  
  // Reverse effect on vaults
  const { data: outgoingVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', exchange.outgoingCurrencyId);
  if (outgoingVaultRows && outgoingVaultRows.length > 0) {
    const outgoingVault = rowToVault(outgoingVaultRows[0]);
    await supabase.from('vaults').update({
      balance: outgoingVault.balance + exchange.outgoingAmount,
      updated_at: now.toISOString(),
    }).eq('id', outgoingVault.id);
  }
  
  const { data: incomingVaultRows } = await supabase.from('vaults').select('*').eq('currency_id', exchange.incomingCurrencyId);
  if (incomingVaultRows && incomingVaultRows.length > 0) {
    const incomingVault = rowToVault(incomingVaultRows[0]);
    await supabase.from('vaults').update({
      balance: incomingVault.balance - exchange.incomingAmount,
      updated_at: now.toISOString(),
    }).eq('id', incomingVault.id);
  }
  
  // Soft delete
  const { error } = await supabase.from('currency_exchanges').update({
    is_deleted: true,
    updated_at: now.toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);
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
  
  const { data } = await supabase.from('currency_exchanges').select('*');
  const exchanges = (data || []).map(rowToCurrencyExchange).filter(e => !e.isDeleted);
  
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
  const { data, error } = await supabase.from('currency_exchanges').select('*').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToCurrencyExchange).filter(e => !e.isDeleted);
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
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await supabase.from('users').insert([userToRow(defaultUser)]);
    if (error) throw new Error(error.message);
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
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw new Error(error.message);
  return (data || []).map(rowToUser);
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

export async function updateUser(userId: string, data: { name?: string }): Promise<User | null> {
  await initializeDatabase();
  const { error } = await supabase.from('users').update({
    ...data,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) throw new Error(error.message);
  
  const { data: updatedRow } = await supabase.from('users').select('*').eq('id', userId).single();
  return updatedRow ? rowToUser(updatedRow) : null;
}

// ============================================
// Vehicle Functions
// ============================================

export async function getVehicles(): Promise<Vehicle[]> {
  await initializeDatabase();
  if (!tablesExist) return [];
  const { data, error } = await supabase.from('vehicles').select('*');
  if (error) throw new Error(error.message);
  return (data || []).map(rowToVehicle).filter(v => v.isActive);
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
  const { data, error } = await supabase.from('vehicle_transactions').select('*').eq('vehicle_id', vehicleId);
  if (error) throw new Error(error.message);
  return (data || []).map(rowToVehicleTransaction);
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
  const { data, error } = await supabase.from('shared_transactions').select('*');
  if (error) throw new Error(error.message);
  return (data || []).map(rowToSharedTransaction);
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
  const { data, error } = await supabase.from('vehicles_settings').select('*');
  if (error) throw new Error(error.message);
  const settings = (data || []).map(rowToVehiclesSettings);
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
  const { data: debtRows } = await supabase.from('debts').select('*').eq('account_id', accountId);
  const accountDebts = (debtRows || []).map(rowToDebt);
  const debtIds = accountDebts.map(d => d.id);
  
  if (debtIds.length === 0) return [];
  
  const { data: paymentRows } = await supabase.from('debt_payments').select('*').in('debt_id', debtIds);
  return (paymentRows || []).map(rowToDebtPayment);
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
  await initializeDatabase();
  if (!tablesExist) {
    return { currencies: 0, vaults: 0, accounts: 0, transactions: 0, debts: 0, debtPayments: 0, currencyExchanges: 0 };
  }
  
  const [curRes, vRes, aRes, tRes, dRes, dpRes, ceRes] = await Promise.all([
    supabase.from('currencies').select('id', { count: 'exact', head: true }),
    supabase.from('vaults').select('id', { count: 'exact', head: true }),
    supabase.from('accounts').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
    supabase.from('debts').select('id', { count: 'exact', head: true }),
    supabase.from('debt_payments').select('id', { count: 'exact', head: true }),
    supabase.from('currency_exchanges').select('id', { count: 'exact', head: true }),
  ]);
  
  return {
    currencies: curRes.count || 0,
    vaults: vRes.count || 0,
    accounts: aRes.count || 0,
    transactions: tRes.count || 0,
    debts: dRes.count || 0,
    debtPayments: dpRes.count || 0,
    currencyExchanges: ceRes.count || 0,
  };
}
