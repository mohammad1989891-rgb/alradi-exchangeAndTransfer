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

// ============================================
// 🔹 دوال عرض مركزية لليرة السورية
// تستخدم في جميع مكونات العرض
// ============================================

/**
 * تنسيق مبلغ للعرض حسب العملة مع دعم الإصدار الجديد
 * Format any amount for display with automatic SYP conversion
 * 
 * هذه الدالة المركزية التي يجب استخدامها في جميع أماكن عرض المبالغ
 * 
 * @param storedValue - القيمة المخزنة (الإصدار القديم دائماً)
 * @param currencyId - معرف العملة
 * @param currencyCode - رمز العملة
 * @param displayVersion - إصدار العرض المطلوب
 * @param decimals - عدد الخانات العشرية
 * @returns القيمة المنسقة للعرض
 */
export function formatAmountWithSYP(
  storedValue: number,
  currencyId?: string,
  currencyCode?: string,
  displayVersion: 'NEW' | 'OLD' = 'NEW',
  decimals: number = 2
): string {
  if (isSYPCurrency(currencyId, currencyCode)) {
    const displayValue = calculateDisplayValue(storedValue, displayVersion);
    const formatted = displayValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatted;
  }
  // للعملات الأخرى
  return storedValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * الحصول على القيمة المعروضة رقمياً (بدون تنسيق)
 * Get raw display value (unformatted) for calculations in UI
 */
export function getDisplayAmount(
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
 * تنسيق مبلغ مع عرض الإصدار القديم بجانب الجديد
 * Format amount with both versions shown (compact inline)
 * 
 * مثال: "100 (10,000 قديم)"
 */
export function formatAmountWithBothVersions(
  storedValue: number,
  currencyId?: string,
  currencyCode?: string,
  displayVersion: 'NEW' | 'OLD' = 'NEW'
): { main: string; sub?: string } {
  if (isSYPCurrency(currencyId, currencyCode)) {
    const newValue = convertToNewVersion(storedValue);
    if (displayVersion === 'NEW') {
      return {
        main: newValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        sub: `(${storedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} قديم)`,
      };
    }
    return {
      main: storedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      sub: `(${newValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جديد)`,
    };
  }
  return {
    main: storedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
}

/**
 * تحويل سعر الصرف لليرة السورية عند الإدخال
 * 
 * المستخدم يدخل السعر بالإصدار الجديد
 * ويتم تحويله داخلياً للإصدار القديم
 * 
 * مثال:
 * - 1$ = 100 ليرة جديدة → المخزن: 10000 (قديم)
 * - الدالة الداخلية تستخدم: rate / 100 = 1 (لتوافق القيم القديمة)
 */
export function convertExchangeRateForInternal(
  userInputRate: number,
  isSYPInvolved: boolean,
  inputVersion: 'NEW' | 'OLD' = 'NEW'
): number {
  if (!isSYPInvolved) return userInputRate;
  
  if (inputVersion === 'NEW') {
    // المستخدم أدخل السعر بالإصدار الجديد
    // نحتاج لتحويله للقيمة المخزنة (القديمة)
    return userInputRate * SYP_CONVERSION_FACTOR;
  }
  return userInputRate;
}

// ============================================
// 🔹 دوال تحويل سعر الصرف العكسي
// للتعامل مع Currency.exchangeRate (قيمة الدولار بليرة سورية)
// هذا الاتجاه عكسي: 1 ليرة = X دولار (صغير)
// بينما معامل التحويل: 1 دولار = X ليرة (كبير)
// ============================================

/**
 * تحويل سعر الصرف العكسي لليرة السورية للعرض
 * 
 * يستخدم مع Currency.exchangeRate الذي يمثل "كم دولار يساوي 1 ليرة"
 * مثال: exchangeRate = 0.00004 (1 ليرة قديمة = 0.00004 دولار)
 * 
 * ⚠️ هذا عكس convertExchangeRateForDisplay لأن:
 * - convertExchangeRateForDisplay: لـ "كم ليرة = 1 دولار" (÷100 للجديد)
 * - هذه الدالة: لـ "كم دولار = 1 ليرة" (×100 للجديد)
 * 
 * المنطق:
 * - 1 ليرة قديمة = 0.00004 دولار
 * - 1 ليرة جديدة (أكبر 100 مرة) = 0.00004 × 100 = 0.004 دولار
 * 
 * @param storedRate - سعر الصرف المخزن (1 ليرة قديمة = X دولار)
 * @param displayVersion - إصدار العرض
 * @returns سعر الصرف بالإصدار المطلوب
 */
export function convertInverseExchangeRateForDisplay(
  storedRate: number,
  displayVersion: 'NEW' | 'OLD' = 'NEW'
): number {
  if (displayVersion === 'NEW') {
    // الليرة الجديدة أكبر 100 مرة → قيمتها بالدولار أكبر 100 مرة
    return storedRate * SYP_CONVERSION_FACTOR;
  }
  return storedRate;
}

/**
 * حساب "كم ليرة سورية = 1 دولار" من سعر الصرف المخزن
 * 
 * Currency.exchangeRate يمثل: 1 ليرة = X دولار
 * هذه الدالة تحسب: Y ليرة = 1 دولار (أي 1/exchangeRate)
 * 
 * مع تحويل الإصدار:
 * - قديم: 1/0.00004 = 25,000 ليرة قديمة = 1 دولار
 * - جديد: 25,000/100 = 250 ليرة جديدة = 1 دولار
 * 
 * @param exchangeRate - سعر الصرف المخزن (1 ليرة = X دولار)
 * @param displayVersion - إصدار العرض
 * @returns عدد الليرات التي تساوي 1 دولار
 */
export function getSypPerUnitRate(
  exchangeRate: number,
  displayVersion: 'NEW' | 'OLD' = 'NEW'
): number {
  if (!exchangeRate || exchangeRate === 0) return 0;
  const sypPerUsd = 1 / exchangeRate; // ليرات قديمة لكل دولار
  if (displayVersion === 'NEW') {
    return sypPerUsd / SYP_CONVERSION_FACTOR; // ليرات جديدة لكل دولار
  }
  return sypPerUsd; // ليرات قديمة لكل دولار
}

/**
 * تحويل سعر الصرف العكسي لليرة السورية عند التخزين
 * 
 * يستخدم مع Currency.exchangeRate الذي يمثل "كم دولار يساوي 1 ليرة"
 * 
 * ⚠️ هذا عكس convertExchangeRateForStorage لأن:
 * - convertExchangeRateForStorage: لـ "كم ليرة = 1 دولار" (×100 للتحويل من جديد لقديم)
 * - هذه الدالة: لـ "كم دولار = 1 ليرة" (÷100 للتحويل من جديد لقديم)
 * 
 * المنطق:
 * - المستخدم يدخل: 1 ليرة جديدة = 0.004 دولار
 * - المخزن: 1 ليرة قديمة = 0.00004 دولار = 0.004 ÷ 100
 * 
 * @param inputRate - سعر الصرف المدخل بالإصدار المحدد
 * @param inputVersion - إصدار الإدخال
 * @returns سعر الصرف المخزن (بالإصدار القديم)
 */
export function convertInverseExchangeRateForStorage(
  inputRate: number,
  inputVersion: 'NEW' | 'OLD'
): number {
  if (inputVersion === 'NEW') {
    // الليرة الجديدة أكبر 100 مرة → قيمتها بالدولار أكبر 100 مرة
    // لذا: المخزن = المدخل ÷ 100
    return inputRate / SYP_CONVERSION_FACTOR;
  }
  return inputRate;
}
