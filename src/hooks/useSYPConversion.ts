'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  isSYPCurrency,
  convertToNewVersion,
  convertToOldVersion,
  calculateStoredValue,
  calculateDisplayValue,
  formatSYPAmount,
  SYP_CURRENCY_ID,
} from '@/lib/syp-conversion';

export type SYPVersion = 'NEW' | 'OLD';

interface UseSYPConversionOptions {
  currencyId?: string;
  currencyCode?: string;
}

/**
 * Hook للتعامل مع تحويلات الليرة السورية
 */
export function useSYPConversion(options: UseSYPConversionOptions = {}) {
  const { currencyId, currencyCode } = options;
  const { currencies } = useAppStore();
  
  // تفضيل المستخدم للإصدار المعروض
  const [displayVersion, setDisplayVersion] = useState<SYPVersion>('NEW');
  
  // التحقق مما إذا كانت العملة هي الليرة السورية
  const isSYP = useMemo(() => {
    return isSYPCurrency(currencyId, currencyCode);
  }, [currencyId, currencyCode]);
  
  // الحصول على معلومات العملة السورية
  const sypCurrency = useMemo(() => {
    return currencies.find(c => c.id === SYP_CURRENCY_ID || c.code === 'SYP');
  }, [currencies]);
  
  /**
   * تحويل القيمة للعرض
   */
  const forDisplay = useCallback((storedValue: number): number => {
    if (!isSYP) return storedValue;
    return calculateDisplayValue(storedValue, displayVersion);
  }, [isSYP, displayVersion]);
  
  /**
   * تحويل القيمة للتخزين
   */
  const forStorage = useCallback((inputValue: number, inputVersion: SYPVersion): number => {
    if (!isSYP) return inputValue;
    return calculateStoredValue(inputValue, inputVersion);
  }, [isSYP]);
  
  /**
   * تنسيق المبلغ للعرض مع الإصدارين
   */
  const formatAmount = useCallback((storedValue: number, showOldVersion = true): string => {
    if (!isSYP) {
      return storedValue.toLocaleString('en-US');
    }
    
    const result = formatSYPAmount(storedValue, { showOldVersion });
    
    if (displayVersion === 'OLD') {
      return storedValue.toLocaleString('en-US');
    }
    
    return result.displayText;
  }, [isSYP, displayVersion]);
  
  /**
   * تحويل سعر الصرف للعرض
   */
  const formatExchangeRate = useCallback((storedRate: number): string => {
    if (!isSYP) {
      return storedRate.toLocaleString('en-US');
    }
    
    if (displayVersion === 'NEW') {
      return convertToNewVersion(storedRate).toLocaleString('en-US');
    }
    
    return storedRate.toLocaleString('en-US');
  }, [isSYP, displayVersion]);
  
  /**
   * تبديل إصدار العرض
   */
  const toggleDisplayVersion = useCallback(() => {
    setDisplayVersion(prev => prev === 'NEW' ? 'OLD' : 'NEW');
  }, []);
  
  return {
    isSYP,
    displayVersion,
    setDisplayVersion,
    toggleDisplayVersion,
    forDisplay,
    forStorage,
    formatAmount,
    formatExchangeRate,
    sypCurrency,
    // دوال مساعدة
    convertToNewVersion,
    convertToOldVersion,
  };
}

/**
 * Hook مبسط لتحويل القيم في الحقول
 */
export function useSYPField(currencyId?: string) {
  const [inputVersion, setInputVersion] = useState<SYPVersion>('NEW');
  
  const {
    isSYP,
    forDisplay,
    forStorage,
    displayVersion,
    setDisplayVersion,
  } = useSYPConversion({ currencyId });
  
  /**
   * معالجة قيمة الإدخال
   */
  const processInput = useCallback((value: number): number => {
    return forStorage(value, inputVersion);
  }, [forStorage, inputVersion]);
  
  /**
   * معالجة قيمة العرض
   */
  const processDisplay = useCallback((storedValue: number): number => {
    return forDisplay(storedValue);
  }, [forDisplay]);
  
  return {
    isSYP,
    inputVersion,
    setInputVersion,
    displayVersion,
    setDisplayVersion,
    processInput,
    processDisplay,
  };
}
