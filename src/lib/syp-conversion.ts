/**
 * نظام دعم إصدارات الليرة السورية
 * Syrian Pound (SYP) Version Support System
 * 
 * المبدأ: Re-denomination
 * - الإصدار القديم: القيمة المخزنة في قاعدة البيانات
 * - الإصدار الجديد: القيمة المعروضة للمستخدم (القيمة القديمة ÷ 100)
 * 
 * معامل التحويل: 100 (حذف صفرين)
 */

// معامل التحويل (100 = حذف صفرين)
export const SYP_CONVERSION_FACTOR = 100;

// رمز العملة السورية
export const SYP_CURRENCY_CODE = 'SYP';
export const SYP_CURRENCY_ID = 'cur_syp';

/**
 * التحقق مما إذا كانت العملة هي الليرة السورية
 */
export function isSYPCurrency(currencyId: string | undefined, currencyCode: string | undefined): boolean {
  return currencyId === SYP_CURRENCY_ID || currencyCode === SYP_CURRENCY_CODE;
}

/**
 * تحويل من الإصدار القديم إلى الإصدار الجديد (للعرض)
 * Convert from Old Version to New Version (for display)
 * 
 * القيمة الجديدة = القيمة القديمة ÷ 100
 */
export function convertToNewVersion(oldValue: number): number {
  return oldValue / SYP_CONVERSION_FACTOR;
}

/**
 * تحويل من الإصدار الجديد إلى الإصدار القديم (للتخزين)
 * Convert from New Version to Old Version (for storage)
 * 
 * القيمة القديمة = القيمة الجديدة × 100
 */
export function convertToOldVersion(newValue: number): number {
  return newValue * SYP_CONVERSION_FACTOR;
}

/**
 * تنسيق المبلغ للعرض مع دعم الإصدارين
 * Format amount for display with both versions support
 * 
 * مثال:
 * - 100 (جديد)
 * - (10,000 قديم)
 */
export function formatSYPAmount(
  storedValue: number,
  options: {
    showOldVersion?: boolean;
    compact?: boolean;
  } = {}
): { newValue: number; oldValue: number; displayText: string } {
  const { showOldVersion = true, compact = false } = options;
  
  const newValue = convertToNewVersion(storedValue);
  const oldValue = storedValue;
  
  let displayText = '';
  
  if (compact) {
    displayText = newValue.toLocaleString('en-US');
  } else if (showOldVersion) {
    displayText = `${newValue.toLocaleString('en-US')} (جديد)\n(${oldValue.toLocaleString('en-US')} قديم)`;
  } else {
    displayText = newValue.toLocaleString('en-US');
  }
  
  return {
    newValue,
    oldValue,
    displayText,
  };
}

/**
 * تحويل سعر الصرف من الإصدار الجديد إلى القيمة المخزنة
 * 
 * المستخدم يدخل السعر بالإصدار الجديد
 * لكن يجب تحويله للقيمة القديمة للتوافق مع البيانات المخزنة
 */
export function convertExchangeRateForStorage(
  inputRate: number,
  inputVersion: 'NEW' | 'OLD'
): number {
  if (inputVersion === 'NEW') {
    // المستخدم أدخل السعر بالإصدار الجديد
    // نحتاج لتحويله للإصدار القديم
    return inputRate * SYP_CONVERSION_FACTOR;
  }
  // المستخدم أدخل السعر بالإصدار القديم - لا حاجة للتحويل
  return inputRate;
}

/**
 * تحويل سعر الصرف من القيمة المخزنة للعرض بالإصدار الجديد
 */
export function convertExchangeRateForDisplay(
  storedRate: number,
  displayVersion: 'NEW' | 'OLD' = 'NEW'
): number {
  if (displayVersion === 'NEW') {
    return storedRate / SYP_CONVERSION_FACTOR;
  }
  return storedRate;
}

/**
 * التحقق من أن القيمة تبدو كإصدار قديم (قيمة كبيرة)
 * Check if value looks like old version (large value)
 */
export function isLikelyOldVersion(value: number): boolean {
  // إذا كانت القيمة أكبر من 1000، فهي على الأرجح الإصدار القديم
  return value >= 1000;
}

/**
 * اقتراح الإصدار المناسب بناءً على القيمة المدخلة
 */
export function suggestVersion(value: number): 'NEW' | 'OLD' {
  return isLikelyOldVersion(value) ? 'OLD' : 'NEW';
}

/**
 * حساب القيمة المخزنة بناءً على الإدخال والإصدار
 */
export function calculateStoredValue(
  inputValue: number,
  inputVersion: 'NEW' | 'OLD'
): number {
  if (inputVersion === 'NEW') {
    return convertToOldVersion(inputValue);
  }
  return inputValue;
}

/**
 * حساب القيمة المعروضة بناءً على القيمة المخزنة والإصدار المطلوب
 */
export function calculateDisplayValue(
  storedValue: number,
  displayVersion: 'NEW' | 'OLD'
): number {
  if (displayVersion === 'NEW') {
    return convertToNewVersion(storedValue);
  }
  return storedValue;
}

/**
 * تنسيق المبلغ للعرض حسب العملة
 * Format amount for display based on currency
 * 
 * إذا كانت العملة سورية، يتم التحويل للإصدار الجديد
 */
export function formatAmountForDisplay(
  amount: number,
  currencyId?: string,
  currencyCode?: string,
  options: {
    showOldVersion?: boolean;
    decimals?: number;
  } = {}
): string {
  const { showOldVersion = false, decimals = 2 } = options;
  
  if (isSYPCurrency(currencyId, currencyCode)) {
    const newValue = convertToNewVersion(amount);
    if (showOldVersion) {
      return `${newValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} (جديد)\n(${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} قديم)`;
    }
    return newValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  
  // للعملات الأخرى
  return amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * الحصول على القيمة المعروضة حسب العملة
 * Get display value based on currency
 */
export function getDisplayValue(
  storedValue: number,
  currencyId?: string,
  currencyCode?: string,
  displayVersion: 'NEW' | 'OLD' = 'NEW'
): number {
  if (isSYPCurrency(currencyId, currencyCode)) {
    return calculateDisplayValue(storedValue, displayVersion);
  }
  return storedValue;
}

/**
 * الحصول على القيمة المخزنة من قيمة الإدخال
 * Get stored value from input value
 */
export function getStoredValueFromInput(
  inputValue: number,
  currencyId?: string,
  currencyCode?: string,
  inputVersion: 'NEW' | 'OLD' = 'NEW'
): number {
  if (isSYPCurrency(currencyId, currencyCode)) {
    return calculateStoredValue(inputValue, inputVersion);
  }
  return inputValue;
}
