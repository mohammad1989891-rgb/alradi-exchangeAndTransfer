import Dexie from 'dexie';

// Types
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
  exchangeRate: number;
  conversionMethod?: 'MULTIPLY' | 'DIVIDE';  // طريقة التحويل إلى الدولار
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
  // خصائص إضافية للتوافق مع المكونات
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
  // تمييز حركة الفائض الناتجة عن دفعات الديون
  isOverflowTransaction?: boolean;
  // ربط الحركة بالدفعة التي أنتجتها
  relatedPaymentId?: string | null;
  // حالة الحركة: مكتملة أو معلقة
  status: 'COMPLETED' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
  // خصائص إضافية للتوافق مع المكونات
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
  debtType: 'RECEIVABLE' | 'PAYABLE';  // RECEIVABLE = لنا (مستحق لنا), PAYABLE = علينا (مستحق علينا)
  debtMode: 'CASH' | 'DEFERRED';       // CASH = نقدي (يؤثر على الصندوق), DEFERRED = آجل (لا يؤثر على الصندوق)
  isPaid: boolean;
  paidAt?: Date | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  // خصائص إضافية للتوافق مع المكونات
  account?: Account;
  currency?: Currency;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  currencyId: string;  // عملة الدفعة
  description?: string | null;
  date: Date;
  // نوع الدفعة: كاش (تؤثر على الصندوق) أو آجل (لا تؤثر)
  paymentMode?: 'CASH' | 'DEFERRED';
  // اتجاه الدفعة: لنا (RECEIVABLE) أو علينا (PAYABLE)
  paymentDirection?: 'RECEIVABLE' | 'PAYABLE';
  // ربط الدفعة بحركة الفائض إن وجدت
  overflowTransactionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Currency Exchange Module
// ============================================

/**
 * عملية تصريف عملات
 * 
 * جميع القيم المخزنة هي SNAPSHOT (لقطات) من وقت إنشاء العملية
 * ولا تتغير بعد الحفظ - هذا يضمن دقة البيانات التاريخية
 */
export interface CurrencyExchange {
  id: string;
  
  // العملات والمبالغ الأساسية
  outgoingCurrencyId: string;      // العملة المصدر (التي نخرجها)
  incomingCurrencyId: string;      // العملة الهدف (التي ندخلها)
  outgoingAmount: number;          // المبلغ الصادر
  incomingAmount: number;          // المبلغ الوارد
  
  // معاملات التحويل - SNAPSHOT (غير قابلة للتعديل)
  outgoingRateAtTime: number;      // سعر صرف العملة المصدر وقت العملية
  incomingRateAtTime: number;      // سعر صرف العملة الهدف وقت العملية
  outgoingConversionMethod: 'MULTIPLY' | 'DIVIDE';  // طريقة تحويل العملة المصدر
  incomingConversionMethod: 'MULTIPLY' | 'DIVIDE';  // طريقة تحويل العملة الهدف
  
  // القيم بالدولار - SNAPSHOT (محسوبة مرة واحدة عند الإنشاء)
  outgoingUsd: number;             // المبلغ الصادر بالدولار
  incomingUsd: number;             // المبلغ الوارد بالدولار
  
  // الربح/الخسارة - SNAPSHOT
  profit: number;                  // الربح = incomingUsd - outgoingUsd
  
  // معلومات إضافية
  description?: string | null;     // ملاحظات
  date: Date;                      // تاريخ العملية
  
  // Timestamps
  createdAt: Date;                 // تاريخ الإنشاء
  updatedAt: Date;                 // تاريخ آخر تحديث
  
  // علامة الحذف الناعم
  isDeleted?: boolean;             // للحذف الناعم بدلاً من الحذف الفعلي
}

// Database setup
const db = new Dexie('ExchangeAppDB');

// ============================================
// User Model - للمستخدمين وتسجيل الدخول
// ============================================
export interface User {
  id: string;
  username: string;
  password: string;  // سيتم تخزينها مشفرة
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Vehicles Module - قسم المركبات
// ============================================

export interface Vehicle {
  id: string;
  name: string;           // اسم المركبة
  plateNumber?: string;   // رقم اللوحة
  notes?: string;         // ملاحظات
  isActive: boolean;      // نشطة/غير نشطة
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleTransaction {
  id: string;
  vehicleId: string;      // ربط بالمركبة
  date: Date;
  amount: number;         // المبلغ
  partner: 'first' | 'second';  // الشريك الأول أو الثاني
  paymentType: 'cash' | 'deferred';  // كاش أو آجل
  description: string;    // البيان
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
  firstPartnerName: string;   // اسم الشريك الأول
  secondPartnerName: string;  // اسم الشريك الثاني
  updatedAt: Date;
}

db.version(4).stores({
  currencies: 'id, code, name, isDefault, isActive, exchangeRate',
  vaults: 'id, currencyId',
  accounts: 'id, name, type, isActive',
  transactions: 'id, accountId, currencyId, type, paymentType, date',
  debts: 'id, accountId, currencyId, isPaid, date',
  debtPayments: 'id, debtId, date',
  // جدول عمليات الصرف
  currencyExchanges: 'id, outgoingCurrencyId, incomingCurrencyId, date, profit, isDeleted',
  // جدول المستخدمين
  users: 'id, username',
  // جداول المركبات
  vehicles: 'id, name, plateNumber, isActive',
  vehicleTransactions: 'id, vehicleId, partner, paymentType, date',
  sharedTransactions: 'id, partner, paymentType, date',
  vehiclesSettings: 'id',
});

// ============================================
// 🔹 ترقية إلى v5: إضافة حقل الحالة (status)
// جميع الحركات القديمة تعتبر مكتملة (COMPLETED)
// ============================================
db.version(5).stores({
  currencies: 'id, code, name, isDefault, isActive, exchangeRate',
  vaults: 'id, currencyId',
  accounts: 'id, name, type, isActive',
  transactions: 'id, accountId, currencyId, type, paymentType, status, date',
  debts: 'id, accountId, currencyId, isPaid, date',
  debtPayments: 'id, debtId, date',
  currencyExchanges: 'id, outgoingCurrencyId, incomingCurrencyId, date, profit, isDeleted',
  users: 'id, username',
  vehicles: 'id, name, plateNumber, isActive',
  vehicleTransactions: 'id, vehicleId, partner, paymentType, date',
  sharedTransactions: 'id, partner, paymentType, date',
  vehiclesSettings: 'id',
}).upgrade(tx => {
  return tx.table('transactions').toCollection().modify(transaction => {
    if (!transaction.status) {
      transaction.status = 'COMPLETED';
    }
  });
});

// Helper function
function generateId(): string {
  return 'local_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateFinalBalance(
  amount: number,
  conversionFactor: number,
  conversionMethod: string,
  feesType: string,
  feesAmount: number,
  feesDirection: string,
  transactionType: 'INCOME' | 'EXPENSE' = 'INCOME'
): number {
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
    
    // منطق الأجور:
    // إذا تطابق اتجاه الحركة مع اتجاه الأجور = زيادة في المبلغ النهائي
    // إذا اختلف اتجاه الحركة عن اتجاه الأجور = خصم من المبلغ النهائي
    const sameDirection = transactionType === feesDirection;
    
    if (sameDirection) {
      // نفس الاتجاه = زيادة
      finalBalance = finalBalance + feesValue;
    } else {
      // اتجاه مختلف = خصم
      finalBalance = finalBalance - feesValue;
    }
  }
  
  return finalBalance;
}

// Default currencies
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

// Initialize database
let isDbInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (isDbInitialized) return;
  
  const count = await db.table('currencies').count();
  const usdCurrency = await db.table<Currency>('currencies').get('cur_usd');
  
  // إذا تم حذف العملات، أعد إضافتها
  if (count === 0 || !usdCurrency) {
    const now = new Date();
    
    // حذف أي بيانات قديمة
    await db.table('currencies').clear();
    
    // إضافة العملات الافتراضية
    await db.table('currencies').bulkAdd(
      defaultCurrencies.map(c => ({ ...c, createdAt: now, updatedAt: now }))
    );
    
    // التحقق من وجود صندوق الدولار
    const usdVault = await db.table<Vault>('vaults').where('currencyId').equals('cur_usd').first();
    if (!usdVault) {
      await db.table('vaults').add({
        id: 'vault_cur_usd',
        currencyId: 'cur_usd',
        balance: 0,
        openingBalance: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // التحقق من وجود حساب افتراضي
    const accountsCount = await db.table('accounts').count();
    if (accountsCount === 0) {
      await db.table('accounts').add({
        id: 'acc_sample',
        name: 'حساب رئيسي',
        type: 'PRIVATE',
        description: 'الحساب الافتراضي',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  
  // ============================================
  // 🔹 إصلاح سير العملة السورية (SYP)
  // تصحيح conversionMethod من DIVIDE إلى MULTIPLY
  // لأن exchangeRate = 0.00004 يمثل "1 ليرة = 0.00004 دولار"
  // والعملية الصحيحة هي: amount × 0.00004 = usdValue (MULTIPLY)
  // وليس: amount ÷ 0.00004 = نتيجة خاطئة
  // ============================================
  try {
    const sypCurrency = await db.table<Currency>('currencies').get('cur_syp');
    if (sypCurrency && sypCurrency.conversionMethod === 'DIVIDE' && sypCurrency.exchangeRate < 1) {
      await db.table('currencies').update('cur_syp', { 
        conversionMethod: 'MULTIPLY',
        updatedAt: new Date()
      });
    }
  } catch (e) {
    // تجاهل الأخطاء في عملية الإصلاح
    console.warn('SYP migration fix skipped:', e);
  }
  
  isDbInitialized = true;
}

/**
 * إعادة تعيين العملات الافتراضية
 * تستخدم عند حذف العملات عن طريق الخطأ
 */
export async function resetCurrenciesToDefault(): Promise<{ success: boolean; message: string }> {
  try {
    const now = new Date();
    
    // حذف جميع العملات الحالية
    await db.table('currencies').clear();
    
    // إعادة إضافة العملات الافتراضية
    await db.table('currencies').bulkAdd(
      defaultCurrencies.map(c => ({ ...c, createdAt: now, updatedAt: now }))
    );
    
    // التأكد من وجود صندوق الدولار
    const usdVault = await db.table<Vault>('vaults').where('currencyId').equals('cur_usd').first();
    if (!usdVault) {
      await db.table('vaults').add({
        id: 'vault_cur_usd',
        currencyId: 'cur_usd',
        balance: 0,
        openingBalance: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return { success: true, message: 'تم إعادة العملات الافتراضية بنجاح' };
  } catch (error) {
    console.error('Error resetting currencies:', error);
    return { success: false, message: 'حدث خطأ أثناء إعادة التعيين' };
  }
}

// Currency functions
export async function getAllAvailableCurrencies(): Promise<Currency[]> {
  await initializeDatabase();
  return db.table<Currency>('currencies').toArray();
}

export async function getActiveCurrencies(): Promise<Currency[]> {
  await initializeDatabase();
  const all = await db.table<Currency>('currencies').toArray();
  return all.filter(c => c.isActive);
}

export async function activateCurrency(currencyId: string, exchangeRate?: number): Promise<Currency> {
  await initializeDatabase();
  
  const currency = await db.table<Currency>('currencies').get(currencyId);
  if (!currency) throw new Error('العملة غير موجودة');
  
  const now = new Date();
  const rate = exchangeRate ?? currency.exchangeRate ?? 1;
  
  await db.table('currencies').update(currencyId, { isActive: true, exchangeRate: rate, updatedAt: now });
  
  const existingVault = await db.table<Vault>('vaults').where('currencyId').equals(currencyId).first();
  if (!existingVault) {
    await db.table('vaults').add({
      id: 'vault_' + currencyId,
      currencyId,
      balance: 0,
      openingBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  return (await db.table<Currency>('currencies').get(currencyId))!;
}

export async function deactivateCurrency(currencyId: string): Promise<void> {
  await initializeDatabase();
  
  const currency = await db.table<Currency>('currencies').get(currencyId);
  if (currency?.isDefault) throw new Error('لا يمكن إلغاء تفعيل العملة الافتراضية');
  
  await db.table('currencies').update(currencyId, { isActive: false, updatedAt: new Date() });
}

export async function updateCurrencyExchangeRate(currencyId: string, rate: number): Promise<Currency> {
  await initializeDatabase();
  await db.table('currencies').update(currencyId, { exchangeRate: rate, updatedAt: new Date() });
  return (await db.table<Currency>('currencies').get(currencyId))!;
}

// Update currency conversion method
export async function updateCurrencyConversionMethod(currencyId: string, method: 'MULTIPLY' | 'DIVIDE'): Promise<Currency> {
  await initializeDatabase();
  await db.table('currencies').update(currencyId, { conversionMethod: method, updatedAt: new Date() });
  return (await db.table<Currency>('currencies').get(currencyId))!;
}

// ============================================
// 🔹 إضافة عملة مخصصة جديدة (بدون حاجة لـ API)
// 🔸 تعمل بالكامل بدون إنترنت
// ============================================
export async function addCustomCurrency(data: { code: string; name: string; symbol: string; exchangeRate?: number; conversionMethod?: 'MULTIPLY' | 'DIVIDE' }): Promise<Currency> {
  await initializeDatabase();
  
  // 🔸 التحقق من عدم وجود عملة بنفس الرمز
  const existing = await db.table<Currency>('currencies').where('code').equals(data.code.toUpperCase()).first();
  if (existing) {
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
  
  await db.table('currencies').add(currency);
  
  // 🔸 إنشاء صندوق للعملة الجديدة
  const existingVault = await db.table<Vault>('vaults').where('currencyId').equals(id).first();
  if (!existingVault) {
    await db.table('vaults').add({
      id: 'vault_' + id,
      currencyId: id,
      balance: 0,
      openingBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  return currency;
}

// ============================================
// 🔹 حذف عملة من قاعدة البيانات المحلية (بدون حاجة لـ API)
// 🔸 تعمل بالكامل بدون إنترنت
// ============================================
export async function deleteCurrencyFromDb(currencyId: string): Promise<void> {
  await initializeDatabase();
  
  const currency = await db.table<Currency>('currencies').get(currencyId);
  if (!currency) throw new Error('العملة غير موجودة');
  if (currency.isDefault) throw new Error('لا يمكن حذف العملة الافتراضية');
  
  // 🔸 التحقق من عدم وجود حركات مرتبطة بالعملة
  const relatedTransactions = await db.table('transactions').where('currencyId').equals(currencyId).count();
  const relatedDebts = await db.table('debts').where('currencyId').equals(currencyId).count();
  const relatedExchanges = await db.table('currencyExchanges')
    .filter(e => (e.outgoingCurrencyId === currencyId || e.incomingCurrencyId === currencyId) && !e.isDeleted)
    .count();
  
  if (relatedTransactions > 0 || relatedDebts > 0 || relatedExchanges > 0) {
    throw new Error('لا يمكن حذف عملة مرتبطة بحركات أو ديون أو عمليات صرف');
  }
  
  // 🔸 حذف الصندوق المرتبط
  const vault = await db.table<Vault>('vaults').where('currencyId').equals(currencyId).first();
  if (vault) {
    await db.table('vaults').delete(vault.id);
  }
  
  // 🔸 حذف العملة
  await db.table('currencies').delete(currencyId);
}

// Vault functions
export async function getVaults(): Promise<Vault[]> {
  await initializeDatabase();
  return db.table<Vault>('vaults').toArray();
}

// ============================================
// 🔹 دالة مساعدة لتحديث رصيد الصندوق مباشرة
// 🔸 تستخدم لقسم المركبات
// ============================================
export async function updateVaultBalance(currencyId: string, balanceDelta: number): Promise<Vault | null> {
  await initializeDatabase();
  
  const vault = await db.table<Vault>('vaults').where('currencyId').equals(currencyId).first();
  if (vault) {
    const newBalance = vault.balance + balanceDelta;
    await db.table('vaults').update(vault.id, { balance: newBalance, updatedAt: new Date() });
    return db.table<Vault>('vaults').get(vault.id) || null;
  }
  return null;
}

export async function updateVaultOpeningBalance(currencyId: string, openingBalance: number): Promise<Vault | null> {
  await initializeDatabase();
  
  const vault = await db.table<Vault>('vaults').where('currencyId').equals(currencyId).first();
  if (vault) {
    const diff = openingBalance - (vault.openingBalance || 0);
    await db.table('vaults').update(vault.id, { openingBalance, balance: vault.balance + diff, updatedAt: new Date() });
    return db.table<Vault>('vaults').get(vault.id) || null;
  }
  return null;
}

export async function getTotalBalanceInUSD(): Promise<number> {
  await initializeDatabase();
  const allVaults = await db.table<Vault>('vaults').toArray();
  const allCurrencies = await db.table<Currency>('currencies').toArray();
  
  let total = 0;
  for (const vault of allVaults) {
    const currency = allCurrencies.find(c => c.id === vault.currencyId);
    if (currency && currency.isActive) {
      // تطبيق طريقة التحويل المناسبة
      if (currency.conversionMethod === 'DIVIDE') {
        total += vault.balance / currency.exchangeRate;
      } else {
        total += vault.balance * currency.exchangeRate;
      }
    }
  }
  return total;
}

// Account functions
export async function getAccounts(): Promise<Account[]> {
  await initializeDatabase();
  const all = await db.table<Account>('accounts').toArray();
  return all.filter(a => a.isActive);
}

export async function addAccount(data: Partial<Account>): Promise<Account> {
  await initializeDatabase();
  const now = new Date();
  const account: Account = { id: generateId(), name: data.name || '', type: data.type || 'PRIVATE', description: data.description, isActive: true, createdAt: now, updatedAt: now };
  await db.table('accounts').add(account);
  return account;
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account> {
  await initializeDatabase();
  await db.table('accounts').update(id, { ...data, updatedAt: new Date() });
  return (await db.table<Account>('accounts').get(id))!;
}

export async function deleteAccount(id: string): Promise<void> {
  await initializeDatabase();
  await db.table('accounts').update(id, { isActive: false, updatedAt: new Date() });
}

// Transaction functions
export async function getTransactions(limit = 100): Promise<Transaction[]> {
  await initializeDatabase();
  return db.table<Transaction>('transactions').orderBy('date').reverse().limit(limit).toArray();
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
  status?: 'COMPLETED' | 'PENDING';
}): Promise<Transaction> {
  await initializeDatabase();
  const now = new Date();
  
  // 🔸 حساب الرصيد النهائي
  const finalBalance = calculateFinalBalance(
    data.amount || 0, 
    data.conversionFactor || 1, 
    data.conversionMethod || 'MULTIPLY', 
    data.feesType || 'FIXED', 
    data.feesAmount || 0, 
    data.feesDirection || 'INCOME',
    data.type
  );
  
  // 🔹 تحديد حالة الحركة تلقائيًا
  // الحركة معلّقة إذا: لا يوجد مبلغ أساسي، أو لا يوجد معامل تحويل، أو الرصيد النهائي = 0
  const isPending = !data.conversionFactor || data.conversionFactor === 0 
    || !data.amount || data.amount === 0
    || !finalBalance || finalBalance === 0;
  const status = data.status || (isPending ? 'PENDING' : 'COMPLETED');
  
  // 🔸 التحقق من الرصيد فقط للحركات المكتملة
  if (status === 'COMPLETED' && data.paymentType === 'CASH' && data.type === 'INCOME') {
    const vaultCurrencyId = data.baseCurrencyId || data.currencyId;
    const vault = await db.table<Vault>('vaults').where('currencyId').equals(vaultCurrencyId).first();
    if (vault && vault.balance - data.amount < 0) {
      const currency = await db.table<Currency>('currencies').get(vaultCurrencyId);
      throw new Error(`الرصيد غير كافٍ في صندوق ${currency?.name || ''}`);
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
    conversionFactor: data.conversionFactor || 1, 
    conversionMethod: data.conversionMethod || 'MULTIPLY', 
    feesType: data.feesType || 'FIXED', 
    feesDirection: data.feesDirection || 'INCOME', 
    feesAmount: data.feesAmount || 0, 
    finalBalance, 
    description: data.description, 
    date: new Date(data.date),
    isOverflowTransaction: data.isOverflowTransaction || false,
    relatedPaymentId: data.relatedPaymentId || null,
    status,
    createdAt: now, 
    updatedAt: now 
  };
  
  await db.table('transactions').add(transaction);
  
  // 🔸 تحديث الصندوق فقط للحركات المكتملة والنقدية
  if (status === 'COMPLETED' && data.paymentType === 'CASH') {
    const vaultCurrencyId = data.baseCurrencyId || data.currencyId;
    const vault = await db.table<Vault>('vaults').where('currencyId').equals(vaultCurrencyId).first();
    if (vault) {
      const newBalance = data.type === 'INCOME' ? vault.balance - data.amount : vault.balance + data.amount;
      await db.table('vaults').update(vault.id, { balance: newBalance, updatedAt: now });
    }
  }
  
  return transaction;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
  await initializeDatabase();
  const old = await db.table<Transaction>('transactions').get(id);
  if (!old) throw new Error('الحركة غير موجودة');
  
  const now = new Date();
  const oldStatus = old.status || 'COMPLETED';
  const newStatus = data.status ?? oldStatus;
  
  // 🔸 استخدام القيم الجديدة إذا وُجدت، وإلا القيم القديمة
  // ملاحظة: نستخدم ?? بدلاً من || لأن القيمة 0 قيمة صحيحة يجب احترامها
  const effectiveAmount = data.amount ?? old.amount;
  const effectiveConversionFactor = data.conversionFactor ?? old.conversionFactor;
  const effectiveConversionMethod = data.conversionMethod ?? old.conversionMethod;
  const effectiveFeesType = data.feesType ?? old.feesType;
  const effectiveFeesAmount = data.feesAmount ?? old.feesAmount;
  const effectiveFeesDirection = data.feesDirection ?? old.feesDirection;
  const effectiveType = data.type ?? old.type;
  const effectivePaymentType = data.paymentType ?? old.paymentType;
  
  // 🔸 عكس التأثير على الصندوق فقط إذا كانت الحركة القديمة مكتملة ونقدية
  if (oldStatus === 'COMPLETED' && old.paymentType === 'CASH') {
    const oldVaultCurrencyId = old.baseCurrencyId || old.currencyId;
    const oldVault = await db.table<Vault>('vaults').where('currencyId').equals(oldVaultCurrencyId).first();
    if (oldVault) {
      const reversed = old.type === 'INCOME' ? oldVault.balance + old.amount : oldVault.balance - old.amount;
      await db.table('vaults').update(oldVault.id, { balance: reversed, updatedAt: now });
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
  
  // 🔸 تحديد الحالة النهائية:
  // إذا كانت جميع البيانات مكتملة (مبلغ > 0 + معامل تحويل > 0 + رصيد نهائي > 0) → نستخدم الحالة الممررة
  // إذا نقص أي حقل → معلّقة تلقائيًا
  const isDataComplete = effectiveAmount > 0 && effectiveConversionFactor > 0 && finalBalance > 0;
  const effectiveNewStatus = isDataComplete ? newStatus : 'PENDING';
  
  // 🔸 تنظيف البيانات - إزالة الحقول غير المعرفة (undefined)
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  
  await db.table('transactions').update(id, { ...cleanData, finalBalance, status: effectiveNewStatus, date: data.date ? new Date(data.date) : old.date, updatedAt: now });
  
  // 🔸 تطبيق التأثير على الصندوق فقط إذا كانت الحركة الجديدة مكتملة ونقدية
  if (effectiveNewStatus === 'COMPLETED' && effectivePaymentType === 'CASH') {
    const vaultCurrencyId = (data.baseCurrencyId ?? data.currencyId) ?? (old.baseCurrencyId || old.currencyId);
    const vault = await db.table<Vault>('vaults').where('currencyId').equals(vaultCurrencyId).first();
    if (vault) {
      const newBalance = effectiveType === 'INCOME' ? vault.balance - effectiveAmount : vault.balance + effectiveAmount;
      await db.table('vaults').update(vault.id, { balance: newBalance, updatedAt: now });
    }
  }
  
  return (await db.table<Transaction>('transactions').get(id))!;
}

export async function deleteTransaction(id: string): Promise<void> {
  await initializeDatabase();
  const transaction = await db.table<Transaction>('transactions').get(id);
  if (!transaction) throw new Error('الحركة غير موجودة');
  
  // ============================================
  // 🔹 عكس التأثير على الصندوق للحركات النقدية
  // 🔸 للحركات العادية: نستخدم baseCurrencyId || currencyId
  // 🔸 لحركات الفائض: نستخدم currencyId مباشرة
  // 🔸 INCOME (لنا) = كان خصم → نزيد
  // 🔸 EXPENSE (علينا) = كانت إضافة → نخصم
  // ============================================
  // 🔸 عكس التأثير على الصندوق فقط للحركات المكتملة والنقدية
  if ((transaction.status || 'COMPLETED') !== 'PENDING' && transaction.paymentType === 'CASH') {
    // تحديد عملة الصندوق
    // لحركات الفائض: نستخدم currencyId مباشرة لأن baseCurrencyId يكون null
    // للحركات العادية: نستخدم baseCurrencyId إذا وجد، وإلا currencyId
    const vaultCurrencyId = transaction.isOverflowTransaction 
      ? transaction.currencyId 
      : (transaction.baseCurrencyId || transaction.currencyId);
    
    const vault = await db.table<Vault>('vaults').where('currencyId').equals(vaultCurrencyId).first();
    
    if (vault) {
      let newBalance = vault.balance;
      
      // ============================================
      // 🔹 منطق عكس التأثير:
      // 🔸 INCOME (لنا): كان خصم من الصندوق → نزيده
      // 🔸 EXPENSE (علينا): كانت إضافة للصندوق → ننقصه
      // ============================================
      if (transaction.type === 'INCOME') {
        // INCOME = كان خصم من الصندوق → نزيده
        newBalance = vault.balance + transaction.amount;
      } else {
        // EXPENSE = كانت إضافة للصندوق → ننقصه
        newBalance = vault.balance - transaction.amount;
      }
      
      await db.table('vaults').update(vault.id, { balance: newBalance, updatedAt: new Date() });
    }
  }
  
  // ============================================
  // 🔹 إذا كانت حركة فائض مرتبطة بدفعة، نزيل المرجع من الدفعة
  // ============================================
  if (transaction.isOverflowTransaction && transaction.relatedPaymentId) {
    const payment = await db.table<DebtPayment>('debtPayments').get(transaction.relatedPaymentId);
    if (payment && payment.overflowTransactionId === id) {
      await db.table('debtPayments').update(payment.id, { 
        overflowTransactionId: null,
        updatedAt: new Date() 
      });
    }
  }
  
  await db.table('transactions').delete(id);
}

// Debt functions
export async function getDebts(limit = 100): Promise<Debt[]> {
  await initializeDatabase();
  return db.table<Debt>('debts').orderBy('date').reverse().limit(limit).toArray();
}

export async function addDebt(data: { 
  accountId: string; 
  currencyId: string; 
  amount: number; 
  conversionFactor: number; 
  conversionMethod: 'MULTIPLY' | 'DIVIDE'; 
  description?: string; 
  date: string;
  debtType?: 'RECEIVABLE' | 'PAYABLE';  // نوع الدين: لنا أو علينا
  debtMode?: 'CASH' | 'DEFERRED';       // طريقة الدين: نقدي أو آجل
}): Promise<Debt> {
  await initializeDatabase();
  const now = new Date();
  const finalBalance = data.conversionMethod === 'MULTIPLY' 
    ? data.amount * (data.conversionFactor || 1) 
    : data.amount / (data.conversionFactor || 1);
  
  const debtMode = data.debtMode || 'DEFERRED';  // افتراضياً آجل (للتوافق مع البيانات القديمة)
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
    updatedAt: now 
  };
  
  await db.table('debts').add(debt);
  
  // ============================================
  // منطق التأثير على الصندوق
  // ============================================
  // إذا كان الدين نقدي (CASH):
  // - علينا (PAYABLE): نستلم مبلغ => زيادة في الصندوق
  // - لنا (RECEIVABLE): نعطي مبلغ => خصم من الصندوق
  // إذا كان الدين آجل (DEFERRED): لا يؤثر على الصندوق
  
  if (debtMode === 'CASH') {
    const vault = await db.table<Vault>('vaults')
      .where('currencyId').equals(data.currencyId).first();
    
    if (vault) {
      let newBalance = vault.balance;
      
      if (debtType === 'PAYABLE') {
        // دين علينا نقدي: استلمنا مالاً => زيادة في الصندوق
        newBalance = vault.balance + data.amount;
      } else {
        // دين لنا نقدي: أعطينا مالاً => خصم من الصندوق
        newBalance = vault.balance - data.amount;
      }
      
      await db.table('vaults').update(vault.id, { 
        balance: newBalance, 
        updatedAt: now 
      });
    }
  }
  
  return debt;
}

export async function updateDebt(id: string, data: Partial<Debt>): Promise<Debt> {
  await initializeDatabase();
  await db.table('debts').update(id, { ...data, updatedAt: new Date() });
  return (await db.table<Debt>('debts').get(id))!;
}

export async function deleteDebt(id: string): Promise<void> {
  await initializeDatabase();
  
  // جلب الدين قبل الحذف لمعرفة تفاصيله
  const debt = await db.table<Debt>('debts').get(id);
  if (!debt) {
    throw new Error('الدين غير موجود');
  }
  
  // ============================================
  // 🔹 التأثير العكسي على الصندوق عند الحذف
  // 🔸 فقط إذا كان الدين نقدي (CASH)
  // 🔸 علينا (PAYABLE): كان زاد الصندوق => ننقصه
  // 🔸 لنا (RECEIVABLE): كان أنقص الصندوق => نزيده
  // 🔸 آجل (DEFERRED): لا يوجد تأثير عكسي
  // ============================================
  
  if (debt.debtMode === 'CASH') {
    const vault = await db.table<Vault>('vaults')
      .where('currencyId').equals(debt.currencyId).first();
    
    if (vault) {
      let newBalance = vault.balance;
      
      if (debt.debtType === 'PAYABLE') {
        // كان زاد الصندوق => ننقصه (عكس العملية الأصلية)
        newBalance = vault.balance - debt.amount;
      } else {
        // كان أنقص الصندوق => نزيده (عكس العملية الأصلية)
        newBalance = vault.balance + debt.amount;
      }
      
      await db.table('vaults').update(vault.id, { 
        balance: newBalance, 
        updatedAt: new Date() 
      });
    }
  }
  
  // ============================================
  // 🔹 معالجة الدفعات المرتبطة بالدين
  // 🔸 نحذف الدفعات المرتبطة
  // 🔸 نحذف حركات الفائض المرتبطة بها إن وجدت
  // 🔸 نعكس تأثيرها على الصندوق إذا كانت كاش
  // ============================================
  
  const payments = await db.table<DebtPayment>('debtPayments')
    .where('debtId').equals(id).toArray();
  
  for (const payment of payments) {
    // ============================================
    // 🔹 عكس تأثير الدفعة على الصندوق
    // 🔸 فقط إذا كانت كاش (CASH)
    // 🔸 RECEIVABLE = كان خصم من الصندوق → نزيده
    // 🔸 PAYABLE = كان إضافة للصندوق → ننقصه
    // ============================================
    const paymentMode = payment.paymentMode || 'CASH';
    const paymentDirection = payment.paymentDirection || debt.debtType || 'RECEIVABLE';
    
    if (paymentMode === 'CASH') {
      const paymentVault = await db.table<Vault>('vaults')
        .where('currencyId').equals(payment.currencyId).first();
      
      if (paymentVault) {
        let newPaymentBalance = paymentVault.balance;
        
        if (paymentDirection === 'RECEIVABLE') {
          // كان خصم من الصندوق → نزيده
          newPaymentBalance = paymentVault.balance + payment.amount;
        } else {
          // كان إضافة للصندوق → ننقصه
          newPaymentBalance = paymentVault.balance - payment.amount;
        }
        
        await db.table('vaults').update(paymentVault.id, { 
          balance: newPaymentBalance, 
          updatedAt: new Date() 
        });
      }
    }
    
    // إذا كان للدفعة حركة فائض مرتبطة
    if (payment.overflowTransactionId) {
      const overflowTransaction = await db.table<Transaction>('transactions')
        .get(payment.overflowTransactionId);
      
      if (overflowTransaction) {
        // ============================================
        // 🔹 عكس تأثير حركة الفائض على الصندوق
        // 🔸 فقط إذا كانت كاش (CASH)
        // 🔸 INCOME = كان خصم من الصندوق → نزيده
        // 🔸 EXPENSE = كان إضافة للصندوق → ننقصه
        // ============================================
        if (overflowTransaction.paymentType === 'CASH') {
          const overflowVault = await db.table<Vault>('vaults')
            .where('currencyId').equals(overflowTransaction.currencyId).first();
          
          if (overflowVault) {
            let newOverflowBalance = overflowVault.balance;
            
            if (overflowTransaction.type === 'INCOME') {
              // كان خصم من الصندوق → نزيده
              newOverflowBalance = overflowVault.balance + overflowTransaction.amount;
            } else {
              // كان إضافة للصندوق → ننقصه
              newOverflowBalance = overflowVault.balance - overflowTransaction.amount;
            }
            
            await db.table('vaults').update(overflowVault.id, { 
              balance: newOverflowBalance, 
              updatedAt: new Date() 
            });
          }
        }
        
        // حذف حركة الفائض
        await db.table('transactions').delete(payment.overflowTransactionId);
      }
    }
    
    // حذف الدفعة
    await db.table('debtPayments').delete(payment.id);
  }
  
  // ============================================
  // 🔹 حذف الدين
  // ============================================
  await db.table('debts').delete(id);
}

// Debt Payment functions
export async function getDebtPayments(debtId?: string): Promise<DebtPayment[]> {
  await initializeDatabase();
  if (debtId) {
    return db.table<DebtPayment>('debtPayments').where('debtId').equals(debtId).toArray();
  }
  return db.table<DebtPayment>('debtPayments').orderBy('date').reverse().toArray();
}

export async function updateDebtPayment(id: string, data: Partial<DebtPayment>): Promise<DebtPayment> {
  await initializeDatabase();
  await db.table('debtPayments').update(id, { ...data, updatedAt: new Date() });
  return (await db.table<DebtPayment>('debtPayments').get(id))!;
}

export async function addDebtPayment(data: { 
  debtId: string; 
  amount: number; 
  currencyId: string;  // عملة الدفعة
  description?: string; 
  date: string;
  paymentMode?: 'CASH' | 'DEFERRED';        // نوع الدفع: كاش أو آجل
  direction?: 'RECEIVABLE' | 'PAYABLE';     // اتجاه الرصيد التراكمي
  currentBalance?: number;                  // الرصيد الحالي التراكمي
}): Promise<DebtPayment> {
  await initializeDatabase();
  const now = new Date();
  
  // الحصول على الدين لمعرفة تفاصيله
  const debt = await db.table<Debt>('debts').get(data.debtId);
  if (!debt) {
    throw new Error('الدين غير موجود');
  }
  
  // ============================================
  // تحديد نوع الدفع
  // ============================================
  const paymentMode = data.paymentMode || 'CASH';
  
  // ============================================
  // 🔹 المنطق المحاسبي الصحيح للرصيد:
  // 🔸 الرصيد السالب (علينا) = الطرف الآخر مدين لنا
  // 🔸 الرصيد الموجب (لنا) = نحن مدينون للطرف الآخر
  // ============================================
  
  // إذا تم تمرير currentBalance، نستخدمه لتحديد الاتجاه الصحيح
  // وإلا نستخدم direction الممرر أو debtType كافتراضي
  let paymentDirection: 'RECEIVABLE' | 'PAYABLE';
  
  if (data.currentBalance !== undefined) {
    // 🔹 القاعدة المحاسبية الصحيحة:
    // الرصيد السالب (علينا) → عند الدفع نزيد الرصيد (جمع) → direction = RECEIVABLE
    // الرصيد الموجب (لنا) → عند الدفع ننقص الرصيد (طرح) → direction = PAYABLE
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
  
  // إضافة الدفعة
  await db.table('debtPayments').add(payment);
  
  // ============================================
  // تحديث حالة الدين (الرصيد النهائي)
  // ============================================
  const allPayments = await db.table<DebtPayment>('debtPayments')
    .where('debtId').equals(data.debtId).toArray();
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  
  if (totalPaid >= debt.finalBalance) {
    await db.table('debts').update(data.debtId, { 
      isPaid: true, 
      paidAt: now,
      updatedAt: now 
    });
  }
  
  // ============================================
  // 🔹 تأثير الدفعة على الصندوق الفرعي
  // 🔸 القاعدة المحاسبية الصحيحة:
  // 🔸 الرصيد السالب (علينا) = نحن مدينون → عند الدفع ندفع للطرف → خصم من الصندوق
  // 🔸 الرصيد الموجب (لنا) = الطرف مدين → عند الدفع نقبض من الطرف → إضافة للصندوق
  // 🔸 آجل = لا تأثير على الصندوق
  // ============================================
  
  if (paymentMode === 'CASH') {
    const vault = await db.table<Vault>('vaults')
      .where('currencyId').equals(data.currencyId).first();
    
    if (vault) {
      let newVaultBalance = vault.balance;
      
      // 🔹 استخدام الرصيد التراكمي لتحديد تأثير الصندوق
      if (data.currentBalance !== undefined) {
        if (data.currentBalance < 0) {
          // الرصيد علينا (سالب) = ندفع للطرف = خصم من الصندوق
          newVaultBalance = vault.balance - data.amount;
        } else {
          // الرصيد لنا (موجب) = نقبض من الطرف = إضافة للصندوق
          newVaultBalance = vault.balance + data.amount;
        }
      } else {
        // التوافق مع البيانات القديمة
        if (paymentDirection === 'RECEIVABLE') {
          newVaultBalance = vault.balance - data.amount;
        } else {
          newVaultBalance = vault.balance + data.amount;
        }
      }
      
      await db.table('vaults').update(vault.id, { 
        balance: newVaultBalance, 
        updatedAt: now 
      });
    }
  }
  // آجل = لا تأثير على الصندوق
  
  return payment;
}

export async function deleteDebtPayment(id: string): Promise<void> {
  await initializeDatabase();
  
  // جلب الدفعة قبل الحذف
  const payment = await db.table<DebtPayment>('debtPayments').get(id);
  if (!payment) {
    throw new Error('الدفعة غير موجودة');
  }
  
  // جلب الدين لمعرفة تفاصيله
  const debt = await db.table<Debt>('debts').get(payment.debtId);
  
  if (debt) {
    // ============================================
    // 🔹 التأثير العكسي للدفعة على الصندوق
    // 🔸 عكس التأثير بناءً على paymentMode
    // 🔸 كاش = عكس التأثير على الصندوق
    // 🔸 آجل = لا تأثير
    // ============================================
    const paymentMode = payment.paymentMode || 'CASH';
    const paymentDirection = payment.paymentDirection || debt.debtType || 'RECEIVABLE';
    
    if (paymentMode === 'CASH') {
      const vault = await db.table<Vault>('vaults')
        .where('currencyId').equals(payment.currencyId).first();
      
      if (vault) {
        let newBalance = vault.balance;
        
        // 🔹 عكس العملية الأصلية:
        // 🔸 إذا كان paymentDirection === 'RECEIVABLE':
        //     - الكود القديم: كان خصم من الصندوق → نزيده
        // 🔸 إذا كان paymentDirection === 'PAYABLE':
        //     - الكود القديم: كان إضافة للصندوق → ننقصه
        if (paymentDirection === 'RECEIVABLE') {
          // كانت خصم من الصندوق → نزيده
          newBalance = vault.balance + payment.amount;
        } else {
          // كانت إضافة للصندوق → ننقصه
          newBalance = vault.balance - payment.amount;
        }
        
        await db.table('vaults').update(vault.id, { 
          balance: newBalance, 
          updatedAt: new Date() 
        });
      }
    }
    // آجل = لا تأثير على الصندوق
    
    // ============================================
    // 🔹 حذف حركة الفائض المرتبطة إن وجدت
    // 🔸 إذا كان الفائض كاش (paymentType === 'CASH') → عكس التأثير على الصندوق
    // 🔸 إذا كان الفائض آجل (paymentType === 'DEFERRED') → لا تأثير على الصندوق
    // ============================================
    if (payment.overflowTransactionId) {
      const overflowTransaction = await db.table<Transaction>('transactions').get(payment.overflowTransactionId);
      if (overflowTransaction) {
        // 🔹 إذا كان الفائض كاش، نعكس تأثيره على الصندوق
        if (overflowTransaction.paymentType === 'CASH') {
          const overflowVault = await db.table<Vault>('vaults')
            .where('currencyId').equals(overflowTransaction.currencyId).first();
          
          if (overflowVault) {
            let newOverflowBalance = overflowVault.balance;
            
            // عكس تأثير حركة الفائض على الصندوق:
            // - INCOME (لنا): كان أضاف للصندوق → ننقصه
            // - EXPENSE (علينا): كان خصم من الصندوق → نزيده
            if (overflowTransaction.type === 'INCOME') {
              newOverflowBalance = overflowVault.balance - overflowTransaction.amount;
            } else {
              newOverflowBalance = overflowVault.balance + overflowTransaction.amount;
            }
            
            await db.table('vaults').update(overflowVault.id, { 
              balance: newOverflowBalance, 
              updatedAt: new Date() 
            });
          }
        }
        
        // حذف حركة الفائض
        await db.table('transactions').delete(payment.overflowTransactionId);
      }
    }
    
    // تحديث حالة الدين إذا لم يعد مسدداً بالكامل
    const remainingPayments = await db.table<DebtPayment>('debtPayments')
      .where('debtId').equals(payment.debtId)
      .filter(p => p.id !== id)
      .toArray();
    
    const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPaid < debt.finalBalance && debt.isPaid) {
      await db.table('debts').update(payment.debtId, { 
        isPaid: false, 
        paidAt: null,
        updatedAt: new Date() 
      });
    }
  }
  
  // حذف الدفعة
  await db.table('debtPayments').delete(id);
}

// Get total debt remaining with separation by type and mode
export async function getTotalDebtRemaining(): Promise<{
  totalDebts: number;
  totalPaid: number;
  totalRemaining: number;
  unpaidDebtsCount: number;
  paidDebtsCount: number;
  totalReceivable: number;   // إجمالي الديون لنا
  totalPayable: number;      // إجمالي الديون علينا
  totalReceivablePaid: number;  // المدفوع من الديون لنا
  totalPayablePaid: number;     // المدفوع من الديون علينا
  totalReceivableRemaining: number;  // المتبقي من الديون لنا
  totalPayableRemaining: number;     // المتبقي من الديون علينا
  // الديون الآجلة فقط (التي لم تؤثر على الصندوق)
  deferredReceivable: number;       // إجمالي الديون الآجلة لنا
  deferredPayable: number;          // إجمالي الديون الآجلة علينا
  deferredReceivablePaid: number;   // المدفوع من الديون الآجلة لنا
  deferredPayablePaid: number;      // المدفوع من الديون الآجلة علينا
  deferredReceivableRemaining: number;  // المتبقي من الديون الآجلة لنا
  deferredPayableRemaining: number;     // المتبقي من الديون الآجلة علينا
  // الديون النقدية فقط (التي أثرت على الصندوق)
  cashReceivable: number;           // إجمالي الديون النقدية لنا
  cashPayable: number;              // إجمالي الديون النقدية علينا
  cashReceivablePaid: number;       // المدفوع من الديون النقدية لنا
  cashPayablePaid: number;          // المدفوع من الديون النقدية علينا
  cashReceivableRemaining: number;  // المتبقي من الديون النقدية لنا
  cashPayableRemaining: number;     // المتبقي من الديون النقدية علينا
}> {
  await initializeDatabase();
  const allDebts = await db.table<Debt>('debts').toArray();
  const allPayments = await db.table<DebtPayment>('debtPayments').toArray();
  
  // فصل الديون حسب النوع (لنا / علينا)
  const receivableDebts = allDebts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
  const payableDebts = allDebts.filter(d => d.debtType === 'PAYABLE');
  
  // فصل الديون الآجلة عن النقدية
  const deferredReceivableDebts = receivableDebts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);
  const deferredPayableDebts = payableDebts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);
  const cashReceivableDebts = receivableDebts.filter(d => d.debtMode === 'CASH');
  const cashPayableDebts = payableDebts.filter(d => d.debtMode === 'CASH');
  
  // الإجماليات
  const totalReceivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalPayable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalDebts = allDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  // الديون الآجلة
  const deferredReceivable = deferredReceivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const deferredPayable = deferredPayableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  // الديون النقدية
  const cashReceivable = cashReceivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const cashPayable = cashPayableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  // حساب المدفوع لكل دين
  const paymentsByDebt = new Map<string, number>();
  for (const payment of allPayments) {
    const current = paymentsByDebt.get(payment.debtId) || 0;
    paymentsByDebt.set(payment.debtId, current + payment.amount);
  }
  
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // حساب المدفوع لكل نوع (إجمالي)
  let totalReceivablePaid = 0;
  let totalPayablePaid = 0;
  for (const debt of receivableDebts) {
    totalReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of payableDebts) {
    totalPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  // حساب المدفوع للديون الآجلة
  let deferredReceivablePaid = 0;
  let deferredPayablePaid = 0;
  for (const debt of deferredReceivableDebts) {
    deferredReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of deferredPayableDebts) {
    deferredPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  // حساب المدفوع للديون النقدية
  let cashReceivablePaid = 0;
  let cashPayablePaid = 0;
  for (const debt of cashReceivableDebts) {
    cashReceivablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  for (const debt of cashPayableDebts) {
    cashPayablePaid += paymentsByDebt.get(debt.id) || 0;
  }
  
  // حساب المتبقي
  const totalReceivableRemaining = totalReceivable - totalReceivablePaid;
  const totalPayableRemaining = totalPayable - totalPayablePaid;
  const totalRemaining = totalDebts - totalPaid;
  
  const deferredReceivableRemaining = deferredReceivable - deferredReceivablePaid;
  const deferredPayableRemaining = deferredPayable - deferredPayablePaid;
  
  const cashReceivableRemaining = cashReceivable - cashReceivablePaid;
  const cashPayableRemaining = cashPayable - cashPayablePaid;
  
  // حساب الديون المدفوعة بالكامل
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
    // الديون الآجلة
    deferredReceivable,
    deferredPayable,
    deferredReceivablePaid,
    deferredPayablePaid,
    deferredReceivableRemaining,
    deferredPayableRemaining,
    // الديون النقدية
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

export interface AccountDebtSummary {
  accountId: string;
  account: Account | undefined;
  totalReceivable: number;      // إجمالي الديون لنا
  totalPayable: number;         // إجمالي الديون علينا
  totalReceivablePaid: number;  // المدفوع من الديون لنا
  totalPayablePaid: number;     // المدفوع من الديون علينا
  totalReceivableRemaining: number;  // المتبقي من الديون لنا
  totalPayableRemaining: number;     // المتبقي من الديون علينا
  finalBalance: number;         // الرصيد النهائي = لنا - علينا
  debts: Debt[];               // جميع ديون الحساب
  payments: DebtPayment[];     // جميع دفعات الحساب
}

/**
 * حساب رصيد الديون لحساب معين
 */
export async function getAccountDebtSummary(accountId: string): Promise<AccountDebtSummary> {
  await initializeDatabase();
  
  const account = await db.table<Account>('accounts').get(accountId);
  const allDebts = await db.table<Debt>('debts').where('accountId').equals(accountId).toArray();
  
  // جمع جميع معرفات الديون
  const debtIds = allDebts.map(d => d.id);
  
  // جلب جميع الدفعات المرتبطة بهذه الديون
  const allPayments: DebtPayment[] = [];
  for (const debtId of debtIds) {
    const payments = await db.table<DebtPayment>('debtPayments').where('debtId').equals(debtId).toArray();
    allPayments.push(...payments);
  }
  
  // فصل الديون حسب النوع
  const receivableDebts = allDebts.filter(d => d.debtType === 'RECEIVABLE' || !d.debtType);
  const payableDebts = allDebts.filter(d => d.debtType === 'PAYABLE');
  
  const totalReceivable = receivableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  const totalPayable = payableDebts.reduce((sum, d) => sum + d.finalBalance, 0);
  
  // حساب المدفوع لكل دين
  const paymentsByDebt = new Map<string, number>();
  for (const payment of allPayments) {
    const current = paymentsByDebt.get(payment.debtId) || 0;
    paymentsByDebt.set(payment.debtId, current + payment.amount);
  }
  
  // حساب المدفوع لكل نوع
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
  
  // الرصيد النهائي = (لنا - علينا)
  // موجب = لنا أكثر مما علينا
  // سالب = علينا أكثر مما لنا
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

/**
 * حساب رصيد الديون لجميع الحسابات
 */
export async function getAllAccountsDebtSummary(): Promise<AccountDebtSummary[]> {
  await initializeDatabase();
  
  const accounts = await db.table<Account>('accounts').where('isActive').equals(1).toArray();
  const summaries: AccountDebtSummary[] = [];
  
  for (const account of accounts) {
    const summary = await getAccountDebtSummary(account.id);
    // فقط الحسابات التي لديها ديون
    if (summary.debts.length > 0) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

// Export all data for backup
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
  
  const [currencies, vaults, accounts, transactions, debts, debtPayments, currencyExchanges] = await Promise.all([
    db.table<Currency>('currencies').toArray(),
    db.table<Vault>('vaults').toArray(),
    db.table<Account>('accounts').toArray(),
    db.table<Transaction>('transactions').toArray(),
    db.table<Debt>('debts').toArray(),
    db.table<DebtPayment>('debtPayments').toArray(),
    db.table<CurrencyExchange>('currencyExchanges').toArray(),
  ]);
  
  return {
    currencies,
    vaults,
    accounts,
    transactions,
    debts,
    debtPayments,
    currencyExchanges,
    exportDate: new Date().toISOString(),
    version: '1.0.0',
  };
}

// Import data with merge or replace option
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
      // استبدال: حذف جميع البيانات الحالية
      await Promise.all([
        db.table('currencies').clear(),
        db.table('vaults').clear(),
        db.table('accounts').clear(),
        db.table('transactions').clear(),
        db.table('debts').clear(),
        db.table('debtPayments').clear(),
        db.table('currencyExchanges').clear(),
      ]);
    }
    
    // استيراد العملات
    if (data.currencies && data.currencies.length > 0) {
      for (const currency of data.currencies) {
        if (mergeMode) {
          const existing = await db.table<Currency>('currencies').get(currency.id);
          if (existing) {
            await db.table('currencies').update(currency.id, currency);
          } else {
            await db.table('currencies').add(currency);
          }
        } else {
          await db.table('currencies').add(currency);
        }
      }
    }
    
    // استيراد الصناديق
    if (data.vaults && data.vaults.length > 0) {
      for (const vault of data.vaults) {
        if (mergeMode) {
          const existing = await db.table<Vault>('vaults').get(vault.id);
          if (existing) {
            // في وضع الدمج: نجمع الأرصدة
            await db.table('vaults').update(vault.id, {
              ...vault,
              balance: existing.balance + vault.balance,
              openingBalance: existing.openingBalance + vault.openingBalance,
            });
          } else {
            await db.table('vaults').add(vault);
          }
        } else {
          await db.table('vaults').add(vault);
        }
      }
    }
    
    // استيراد الحسابات
    if (data.accounts && data.accounts.length > 0) {
      for (const account of data.accounts) {
        if (mergeMode) {
          const existing = await db.table<Account>('accounts').get(account.id);
          if (existing) {
            await db.table('accounts').update(account.id, account);
          } else {
            await db.table('accounts').add(account);
          }
        } else {
          await db.table('accounts').add(account);
        }
      }
    }
    
    // استيراد الحركات (في وضع الدمج: إضافة فقط الجديدة)
    if (data.transactions && data.transactions.length > 0) {
      for (const transaction of data.transactions) {
        if (mergeMode) {
          const existing = await db.table<Transaction>('transactions').get(transaction.id);
          if (!existing) {
            await db.table('transactions').add(transaction);
          }
        } else {
          await db.table('transactions').add(transaction);
        }
      }
    }
    
    // استيراد الديون (في وضع الدمج: إضافة فقط الجديدة)
    if (data.debts && data.debts.length > 0) {
      for (const debt of data.debts) {
        if (mergeMode) {
          const existing = await db.table<Debt>('debts').get(debt.id);
          if (!existing) {
            await db.table('debts').add(debt);
          }
        } else {
          await db.table('debts').add(debt);
        }
      }
    }
    
    // استيراد دفعات الديون (في وضع الدمج: إضافة فقط الجديدة)
    if (data.debtPayments && data.debtPayments.length > 0) {
      for (const payment of data.debtPayments) {
        if (mergeMode) {
          const existing = await db.table<DebtPayment>('debtPayments').get(payment.id);
          if (!existing) {
            await db.table('debtPayments').add(payment);
          }
        } else {
          await db.table('debtPayments').add(payment);
        }
      }
    }
    
    // استيراد عمليات الصرافة (في وضع الدمج: إضافة فقط الجديدة)
    if (data.currencyExchanges && data.currencyExchanges.length > 0) {
      for (const exchange of data.currencyExchanges) {
        if (mergeMode) {
          const existing = await db.table<CurrencyExchange>('currencyExchanges').get(exchange.id);
          if (!existing) {
            await db.table('currencyExchanges').add(exchange);
          }
        } else {
          await db.table('currencyExchanges').add(exchange);
        }
      }
    }
    
    return { success: true, message: 'تم استيراد البيانات بنجاح' };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, message: 'حدث خطأ أثناء استيراد البيانات' };
  }
}

// Clear all data but keep accounts and currencies
export async function clearAllData(): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  try {
    // حذف الحركات
    await db.table('transactions').clear();
    
    // حذف الديون والدفعات
    await db.table('debts').clear();
    await db.table('debtPayments').clear();
    
    // حذف عمليات الصرافة
    await db.table('currencyExchanges').clear();
    
    // إعادة تعيين أرصدة الصناديق إلى الرصيد الافتتاحي
    const vaults = await db.table<Vault>('vaults').toArray();
    for (const vault of vaults) {
      await db.table('vaults').update(vault.id, {
        balance: vault.openingBalance || 0,
        updatedAt: new Date(),
      });
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

/**
 * حساب القيمة بالدولار بناءً على طريقة التحويل
 */
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

/**
 * جلب جميع عمليات الصرف
 */
export async function getCurrencyExchanges(limit = 100): Promise<CurrencyExchange[]> {
  await initializeDatabase();
  const all = await db.table<CurrencyExchange>('currencyExchanges').toArray();
  return all
    .filter(e => !e.isDeleted)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // ترتيب ثانوي: الأحدث إنشاءً أولاً عند تساوي التاريخ
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}

/**
 * جلب عملية صرف واحدة
 */
export async function getCurrencyExchangeById(id: string): Promise<CurrencyExchange | undefined> {
  await initializeDatabase();
  return db.table<CurrencyExchange>('currencyExchanges').get(id);
}

/**
 * إنشاء عملية صرف جديدة
 * 
 * المبدأ: SNAPSHOT - يتم حفظ جميع القيم وقت الإنشاء ولا تتغير لاحقاً
 */
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
  
  // جلب معلومات العملات وقت العملية (SNAPSHOT)
  const outgoingCurrency = await db.table<Currency>('currencies').get(data.outgoingCurrencyId);
  const incomingCurrency = await db.table<Currency>('currencies').get(data.incomingCurrencyId);
  
  if (!outgoingCurrency) {
    throw new Error('العملة المصدر غير موجودة');
  }
  if (!incomingCurrency) {
    throw new Error('العملة الهدف غير موجودة');
  }
  
  // التحقق من رصيد الصندوق المصدر
  const outgoingVault = await db.table<Vault>('vaults')
    .where('currencyId')
    .equals(data.outgoingCurrencyId)
    .first();
  
  if (outgoingVault && outgoingVault.balance < data.outgoingAmount) {
    throw new Error(`الرصيد غير كافٍ في صندوق ${outgoingCurrency.name}`);
  }
  
  // حفظ أسعار الصرف وقت العملية (SNAPSHOT - غير قابل للتعديل)
  const outgoingRateAtTime = outgoingCurrency.exchangeRate;
  const incomingRateAtTime = incomingCurrency.exchangeRate;
  const outgoingConversionMethod = outgoingCurrency.conversionMethod || 'MULTIPLY';
  const incomingConversionMethod = incomingCurrency.conversionMethod || 'MULTIPLY';
  
  // حساب القيم بالدولار (محسوبة مرة واحدة فقط)
  const outgoingUsd = calculateUsdValue(
    data.outgoingAmount,
    outgoingRateAtTime,
    outgoingConversionMethod
  );
  
  const incomingUsd = calculateUsdValue(
    data.incomingAmount,
    incomingRateAtTime,
    incomingConversionMethod
  );
  
  // حساب الربح (موجب = ربح، سالب = خسارة)
  const profit = incomingUsd - outgoingUsd;
  
  // إنشاء سجل العملية
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
  
  // حفظ العملية
  await db.table('currencyExchanges').add(exchange);
  
  // تحديث أرصدة الصناديق
  // خصم من الصندوق المصدر
  if (outgoingVault) {
    await db.table('vaults').update(outgoingVault.id, {
      balance: outgoingVault.balance - data.outgoingAmount,
      updatedAt: now,
    });
  }
  
  // إضافة إلى الصندوق المستقبل
  const incomingVault = await db.table<Vault>('vaults')
    .where('currencyId')
    .equals(data.incomingCurrencyId)
    .first();
  
  if (incomingVault) {
    await db.table('vaults').update(incomingVault.id, {
      balance: incomingVault.balance + data.incomingAmount,
      updatedAt: now,
    });
  }
  
  return exchange;
}

/**
 * حذف عملية صرف (حذف ناعم + عكس تأثيرها على الأرصدة)
 * 
 * ملاحظة: لا يمكن تعديل عملية الصرف، فقط حذفها
 */
export async function deleteCurrencyExchange(id: string): Promise<void> {
  await initializeDatabase();
  
  const exchange = await db.table<CurrencyExchange>('currencyExchanges').get(id);
  if (!exchange) {
    throw new Error('عملية الصرف غير موجودة');
  }
  
  if (exchange.isDeleted) {
    throw new Error('العملة محذوفة بالفعل');
  }
  
  const now = new Date();
  
  // عكس تأثير العملية على الأرصدة
  // إرجاع المبلغ للصندوق المصدر
  const outgoingVault = await db.table<Vault>('vaults')
    .where('currencyId')
    .equals(exchange.outgoingCurrencyId)
    .first();
  
  if (outgoingVault) {
    await db.table('vaults').update(outgoingVault.id, {
      balance: outgoingVault.balance + exchange.outgoingAmount,
      updatedAt: now,
    });
  }
  
  // خصم المبلغ من الصندوق المستقبل
  const incomingVault = await db.table<Vault>('vaults')
    .where('currencyId')
    .equals(exchange.incomingCurrencyId)
    .first();
  
  if (incomingVault) {
    await db.table('vaults').update(incomingVault.id, {
      balance: incomingVault.balance - exchange.incomingAmount,
      updatedAt: now,
    });
  }
  
  // حذف ناعم (للحفاظ على البيانات التاريخية)
  await db.table('currencyExchanges').update(id, {
    isDeleted: true,
    updatedAt: now,
  });
}

/**
 * إحصائيات عمليات الصرف
 */
export async function getExchangeStats(): Promise<{
  totalExchanges: number;
  totalProfit: number;
  totalOutgoingUsd: number;
  totalIncomingUsd: number;
  profitCount: number;
  lossCount: number;
}> {
  await initializeDatabase();
  
  const all = await db.table<CurrencyExchange>('currencyExchanges').toArray();
  const exchanges = all.filter(e => !e.isDeleted);
  
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

export { db };

// ============================================
// تصديرات إضافية للتوافق مع المكونات
// ============================================

// نوع Exchange للتوافق مع المكونات
export type Exchange = CurrencyExchange;

// نوع ExportData للتوافق مع مكون التصدير/الاستيراد
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

// دوال التصدير والاستيراد
export async function downloadDataAsJson(): Promise<void> {
  await initializeDatabase();
  const data: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    currencies: await db.table("currencies").toArray(),
    vaults: await db.table("vaults").toArray(),
    accounts: await db.table("accounts").toArray(),
    transactions: await db.table("transactions").toArray(),
    debts: await db.table("debts").toArray(),
    debtPayments: await db.table("debtPayments").toArray(),
    currencyExchanges: await db.table("currencyExchanges").toArray(),
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
    const now = new Date();
    
    if (data.currencies) {
      await db.table("currencies").clear();
      await db.table("currencies").bulkAdd(data.currencies.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })));
    }
    if (data.vaults) {
      await db.table("vaults").clear();
      await db.table("vaults").bulkAdd(data.vaults.map(v => ({ ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) })));
    }
    if (data.accounts) {
      await db.table("accounts").clear();
      await db.table("accounts").bulkAdd(data.accounts.map(a => ({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) })));
    }
    if (data.transactions) {
      await db.table("transactions").clear();
      await db.table("transactions").bulkAdd(data.transactions.map(t => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt), updatedAt: new Date(t.updatedAt) })));
    }
    if (data.debts) {
      await db.table("debts").clear();
      await db.table("debts").bulkAdd(data.debts.map(d => ({ ...d, date: new Date(d.date), createdAt: new Date(d.createdAt), updatedAt: new Date(d.updatedAt) })));
    }
    if (data.debtPayments) {
      await db.table("debtPayments").clear();
      await db.table("debtPayments").bulkAdd(data.debtPayments.map(p => ({ ...p, date: new Date(p.date), createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) })));
    }
    if (data.currencyExchanges) {
      await db.table("currencyExchanges").clear();
      await db.table("currencyExchanges").bulkAdd(data.currencyExchanges.map(e => ({ ...e, date: new Date(e.date), createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) })));
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
  return {
    currencies: await db.table("currencies").count(),
    vaults: await db.table("vaults").count(),
    accounts: await db.table("accounts").count(),
    transactions: await db.table("transactions").count(),
    debts: await db.table("debts").count(),
    debtPayments: await db.table("debtPayments").count(),
    currencyExchanges: await db.table("currencyExchanges").count(),
  };
}

// ============================================
// دوال إضافية للتوافق مع المكونات الأخرى
// ============================================

// جلب جميع عمليات الصرف (غير المحذوفة)
export async function getExchanges(): Promise<CurrencyExchange[]> {
  await initializeDatabase();
  const all = await db.table<CurrencyExchange>("currencyExchanges").orderBy("date").reverse().toArray();
  return all.filter(e => !e.isDeleted);
}

// إضافة عملية صرف (للتوافق)
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

// حذف عملية صرف (للتوافق)
export async function deleteExchange(id: string): Promise<void> {
  return deleteCurrencyExchange(id);
}

// إضافة دفعة دين للحساب
export async function addAccountDebtPayment(data: {
  debtId: string;
  amount: number;
  note?: string;
  date: string;
}): Promise<DebtPayment> {
  const debt = await db.table<Debt>("debts").get(data.debtId);
  if (!debt) throw new Error("الدين غير موجود");
  
  return addDebtPayment({
    debtId: data.debtId,
    amount: data.amount,
    currencyId: debt.currencyId,
    description: data.note,
    date: data.date,
  });
}

// جلب دفعات ديون الحساب
export async function getAccountDebtPayments(accountId: string): Promise<DebtPayment[]> {
  await initializeDatabase();
  const accountDebts = await db.table<Debt>("debts").where("accountId").equals(accountId).toArray();
  const debtIds = accountDebts.map(d => d.id);
  const allPayments = await db.table<DebtPayment>("debtPayments").toArray();
  return allPayments.filter(p => debtIds.includes(p.debtId));
}

// تحديث سعر الصرف مع طريقة التحويل
export async function updateCurrencyExchangeRateWithMethod(
  currencyId: string, 
  rate: number, 
  conversionMethod?: "MULTIPLY" | "DIVIDE"
): Promise<Currency> {
  await initializeDatabase();
  const updateData: Partial<Currency> = { exchangeRate: rate, updatedAt: new Date() };
  if (conversionMethod) {
    updateData.conversionMethod = conversionMethod;
  }
  await db.table("currencies").update(currencyId, updateData);
  return (await db.table<Currency>("currencies").get(currencyId))!;
}

// ============================================
// User Functions - دوال المستخدمين وتسجيل الدخول
// ============================================

// تشفير بسيط للكلمة السرية (Base64 + reverse)
function hashPassword(password: string): string {
  return btoa(password.split('').reverse().join(''));
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// إنشاء مستخدم افتراضي عند أول تشغيل
export async function initializeDefaultUser(): Promise<User> {
  await initializeDatabase();
  const usersCount = await db.table<User>('users').count();
  
  if (usersCount === 0) {
    const now = new Date();
    const defaultUser: User = {
      id: 'user_default',
      username: 'admin',
      password: hashPassword('admin'),
      name: 'المدير',
      createdAt: now,
      updatedAt: now,
    };
    await db.table('users').add(defaultUser);
    return defaultUser;
  }
  
  return (await db.table<User>('users').toArray())[0];
}

// الحصول على مستخدم بالاسم
export async function getUserByUsername(username: string): Promise<User | undefined> {
  await initializeDatabase();
  return db.table<User>('users').where('username').equals(username).first();
}

// الحصول على جميع المستخدمين
export async function getUsers(): Promise<User[]> {
  await initializeDatabase();
  return db.table<User>('users').toArray();
}

// تسجيل الدخول
export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
  await initializeDatabase();
  
  // التأكد من وجود مستخدم افتراضي
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

// تغيير كلمة المرور
export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  const user = await db.table<User>('users').get(userId);
  
  if (!user) {
    return { success: false, message: 'المستخدم غير موجود' };
  }
  
  if (!verifyPassword(oldPassword, user.password)) {
    return { success: false, message: 'كلمة المرور القديمة غير صحيحة' };
  }
  
  await db.table('users').update(userId, {
    password: hashPassword(newPassword),
    updatedAt: new Date(),
  });
  
  return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
}

// تغيير اسم المستخدم
export async function changeUsername(userId: string, newUsername: string): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  
  // التحقق من عدم وجود اسم مستخدم آخر بنفس الاسم
  const existingUser = await getUserByUsername(newUsername);
  if (existingUser && existingUser.id !== userId) {
    return { success: false, message: 'اسم المستخدم موجود مسبقاً' };
  }
  
  await db.table('users').update(userId, {
    username: newUsername,
    updatedAt: new Date(),
  });
  
  return { success: true, message: 'تم تغيير اسم المستخدم بنجاح' };
}

// تحديث بيانات المستخدم
export async function updateUser(userId: string, data: { name?: string }): Promise<User | null> {
  await initializeDatabase();
  await db.table('users').update(userId, { ...data, updatedAt: new Date() });
  return db.table<User>('users').get(userId) || null;
}

// ============================================
// 🔹 Vehicles Module Functions - دوال المركبات
// 🔹 Additive Fix: حفظ واسترجاع البيانات
// ============================================

// الحصول على جميع المركبات
// 🔹 Fix: استخدام toArray + filter بدلاً من where('isActive').equals(1)
// 🔸 السبب: IndexedDB يخزن boolean كـ true/false وليس 1/0
// 🔸 where('isActive').equals(1) لا يتطابق مع true فيعيد مصفوفة فارغة
export async function getVehicles(): Promise<Vehicle[]> {
  await initializeDatabase();
  const all = await db.table<Vehicle>('vehicles').toArray();
  return all.filter(v => v.isActive);
}

// إضافة مركبة جديدة
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
  
  await db.table('vehicles').add(vehicle);
  return vehicle;
}

// تحديث مركبة
export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
  await initializeDatabase();
  await db.table('vehicles').update(id, { ...data, updatedAt: new Date() });
  return db.table<Vehicle>('vehicles').get(id) || null;
}

// حذف مركبة (حذف فعلي مع جميع معاملاتها)
export async function deleteVehicle(id: string): Promise<void> {
  await initializeDatabase();
  
  // حذف جميع معاملات المركبة
  await db.table('vehicleTransactions').where('vehicleId').equals(id).delete();
  
  // حذف المركبة
  await db.table('vehicles').delete(id);
}

// ============================================
// 🔹 Vehicle Transactions Functions - معاملات المركبات
// ============================================

// الحصول على معاملات مركبة معينة
export async function getVehicleTransactions(vehicleId: string): Promise<VehicleTransaction[]> {
  await initializeDatabase();
  return db.table<VehicleTransaction>('vehicleTransactions').where('vehicleId').equals(vehicleId).toArray();
}

// إضافة معاملة مركبة
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
  
  await db.table('vehicleTransactions').add(transaction);
  return transaction;
}

// تحديث معاملة مركبة
export async function updateVehicleTransaction(id: string, data: Partial<VehicleTransaction>): Promise<VehicleTransaction | null> {
  await initializeDatabase();
  await db.table('vehicleTransactions').update(id, { ...data, updatedAt: new Date() });
  return db.table<VehicleTransaction>('vehicleTransactions').get(id) || null;
}

// حذف معاملة مركبة
export async function deleteVehicleTransaction(id: string): Promise<void> {
  await initializeDatabase();
  await db.table('vehicleTransactions').delete(id);
}

// ============================================
// 🔹 Shared Transactions Functions - البنود العامة
// ============================================

// الحصول على جميع البنود العامة
export async function getSharedTransactions(): Promise<SharedTransaction[]> {
  await initializeDatabase();
  return db.table<SharedTransaction>('sharedTransactions').toArray();
}

// إضافة بند عام
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
  
  await db.table('sharedTransactions').add(transaction);
  return transaction;
}

// تحديث بند عام
export async function updateSharedTransaction(id: string, data: Partial<SharedTransaction>): Promise<SharedTransaction | null> {
  await initializeDatabase();
  await db.table('sharedTransactions').update(id, { ...data, updatedAt: new Date() });
  return db.table<SharedTransaction>('sharedTransactions').get(id) || null;
}

// حذف بند عام
export async function deleteSharedTransaction(id: string): Promise<void> {
  await initializeDatabase();
  await db.table('sharedTransactions').delete(id);
}

// ============================================
// 🔹 Vehicles Settings Functions - إعدادات المركبات
// ============================================

// الحصول على إعدادات المركبات
export async function getVehiclesSettings(): Promise<VehiclesSettings | null> {
  await initializeDatabase();
  const settings = await db.table<VehiclesSettings>('vehiclesSettings').toArray();
  return settings.length > 0 ? settings[0] : null;
}

// حفظ إعدادات المركبات
export async function saveVehiclesSettings(data: {
  firstPartnerName: string;
  secondPartnerName: string;
}): Promise<VehiclesSettings> {
  await initializeDatabase();
  const now = new Date();
  
  const existingSettings = await getVehiclesSettings();
  
  if (existingSettings) {
    await db.table('vehiclesSettings').update(existingSettings.id, {
      firstPartnerName: data.firstPartnerName,
      secondPartnerName: data.secondPartnerName,
      updatedAt: now,
    });
    return db.table<VehiclesSettings>('vehiclesSettings').get(existingSettings.id)!;
  } else {
    const newSettings: VehiclesSettings = {
      id: 'vehicles_settings_1',
      firstPartnerName: data.firstPartnerName,
      secondPartnerName: data.secondPartnerName,
      updatedAt: now,
    };
    await db.table('vehiclesSettings').add(newSettings);
    return newSettings;
  }
}
