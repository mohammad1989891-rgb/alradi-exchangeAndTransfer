'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatNumber, calculateFinalBalance } from '@/lib/format';
import { isSYPCurrency, formatSYPDualDisplay } from '@/lib/syp-conversion';
import type { TransactionFormData } from '@/types';
import { format } from 'date-fns';
import { 
  ArrowUpRight, ArrowDownRight, Calculator, RefreshCcw, 
  Banknote, Clock, Wallet, ArrowRight, Coins, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to format number with thousand separator for input
function formatInputNumber(num: number | string): string {
  if (num === '' || num === null || num === undefined) return '';
  const str = String(num).replace(/,/g, '');
  if (isNaN(parseFloat(str))) return '';
  
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Helper function to parse formatted number
function parseFormattedNumber(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

const defaultFormData: TransactionFormData = {
  accountId: '',
  currencyId: '',
  baseCurrencyId: null,
  type: 'INCOME',
  paymentType: 'CASH',
  amount: 0,
  conversionFactor: 1,
  conversionMethod: 'MULTIPLY',
  feesType: 'FIXED',
  feesDirection: 'INCOME',
  feesAmount: 0,
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
};

export function TransactionModal() {
  const {
    isTransactionModalOpen,
    closeTransactionModal,
    editingTransaction,
    accounts,
    currencies,
  } = useAppStore();
  
  const { addTransaction, updateTransaction, deleteTransaction } = useLocalData();
  
  const [formData, setFormData] = useState<TransactionFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [feesValue, setFeesValue] = useState(0);
  const [convertedAmount, setConvertedAmount] = useState(0);
  
  // Formatted display values
  const [amountDisplay, setAmountDisplay] = useState('');
  const [conversionFactorDisplay, setConversionFactorDisplay] = useState('1');
  const [feesAmountDisplay, setFeesAmountDisplay] = useState('');
  
  // 🔸 وضع الإدخال الذكي
  const [inputMode, setInputMode] = useState<'FACTOR_TO_FINAL' | 'FINAL_TO_FACTOR'>('FACTOR_TO_FINAL');
  const [finalAmountDisplay, setFinalAmountDisplay] = useState('');
  
  // SYP version support - دائماً الإصدار القديم للمدخلات
  // (no conversion needed since OLD = stored value)
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isTransactionModalOpen) {
      setErrorMessage(null); // Clear error message
      if (editingTransaction) {
        // Determine SYP involvement for editing transaction
        const editBaseCurrency = currencies.find(c => c.id === editingTransaction.baseCurrencyId);
        const editTargetCurrency = currencies.find(c => c.id === editingTransaction.currencyId);
        const editIsBaseSYP = isSYPCurrency(editingTransaction.baseCurrencyId, editBaseCurrency?.code);
        const editIsTargetSYP = isSYPCurrency(editingTransaction.currencyId, editTargetCurrency?.code);
        const editIsSYPInvolved = editIsBaseSYP || editIsTargetSYP;
        
        setFormData({
          accountId: editingTransaction.accountId,
          currencyId: editingTransaction.currencyId,
          baseCurrencyId: editingTransaction.baseCurrencyId || null,
          type: editingTransaction.type,
          paymentType: editingTransaction.paymentType || 'CASH',
          amount: editingTransaction.amount,
          conversionFactor: editingTransaction.conversionFactor,
          conversionMethod: editingTransaction.conversionMethod,
          feesType: editingTransaction.feesType,
          feesDirection: editingTransaction.feesDirection || 'INCOME',
          feesAmount: editingTransaction.feesAmount,
          description: editingTransaction.description || '',
          date: format(new Date(editingTransaction.date), 'yyyy-MM-dd'),
        });
        
        // Display amount in OLD version if base is SYP (all inputs use OLD)
        if (editIsBaseSYP) {
          setAmountDisplay(formatInputNumber(editingTransaction.amount));
        } else {
          setAmountDisplay(formatInputNumber(editingTransaction.amount));
        }
        
        // Display conversion factor in OLD version if SYP is involved (all inputs use OLD)
        if (editIsSYPInvolved) {
          setConversionFactorDisplay(formatInputNumber(editingTransaction.conversionFactor));
        } else {
          setConversionFactorDisplay(formatInputNumber(editingTransaction.conversionFactor));
        }
        
        setFeesAmountDisplay(formatInputNumber(editingTransaction.feesAmount));
      } else {
        const defaultCurrency = currencies.find(c => c.isDefault);
        setFormData({
          ...defaultFormData,
          currencyId: defaultCurrency?.id || currencies[0]?.id || '',
          baseCurrencyId: defaultCurrency?.id || currencies[0]?.id || '',
          date: format(new Date(), 'yyyy-MM-dd'),
        });
        setAmountDisplay('');
        setConversionFactorDisplay('1');
        setFeesAmountDisplay('');
      }
    }
  }, [isTransactionModalOpen, editingTransaction, currencies]);
  
  // Get selected currencies
  const baseCurrency = currencies.find(c => c.id === formData.baseCurrencyId);
  const targetCurrency = currencies.find(c => c.id === formData.currencyId);
  const isSameCurrency = formData.baseCurrencyId === formData.currencyId;
  const isBaseSYP = isSYPCurrency(formData.baseCurrencyId, baseCurrency?.code);
  const isTargetSYP = isSYPCurrency(formData.currencyId, targetCurrency?.code);
  const isSYPInvolved = isBaseSYP || isTargetSYP;
  
  // Calculate converted amount
  useEffect(() => {
    let converted = formData.amount;
    if (!isSameCurrency && formData.conversionFactor > 0) {
      if (formData.conversionMethod === 'MULTIPLY') {
        converted = formData.amount * formData.conversionFactor;
      } else {
        converted = formData.amount / formData.conversionFactor;
      }
    }
    setConvertedAmount(converted);
    
    // Calculate final balance with fees
    const result = calculateFinalBalance(
      converted,
      1, // Already converted
      'MULTIPLY',
      formData.feesType,
      formData.feesAmount,
      formData.feesDirection,
      formData.type
    );
    
    setFeesValue(result.feesValue);
    setCalculatedBalance(result.finalBalance);
    
    // 🔸 مزامنة المبلغ النهائي مع حقل الإدخال في وضع نهائي ← معامل
    // عند تغيير أي قيمة في وضع معامل ← نهائي، نحدّث finalAmountDisplay
    // حتى يكون جاهزاً إذا بدّل المستخدم الوضع
    if (inputMode === 'FACTOR_TO_FINAL' && result.finalBalance > 0) {
      setFinalAmountDisplay(formatInputNumber(result.finalBalance));
    }
  }, [formData, isSameCurrency, inputMode]);
  
  // Handle amount input with formatting
  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setAmountDisplay(cleanValue);
    const numValue = parseFormattedNumber(cleanValue);
    // All SYP inputs use OLD version = stored value directly (no conversion needed)
    const storedValue = numValue;
    setFormData({ ...formData, amount: storedValue });
  };
  
  // Handle conversion factor input with formatting
  const handleConversionFactorChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setConversionFactorDisplay(cleanValue);
    const numValue = parseFormattedNumber(cleanValue) || 1;
    // If SYP is involved, user enters rate in OLD version = stored value (no conversion needed)
    const storedValue = numValue;
    setFormData({ ...formData, conversionFactor: storedValue });
  };
  
  // Handle fees amount input with formatting
  const handleFeesAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setFeesAmountDisplay(cleanValue);
    const numValue = parseFormattedNumber(cleanValue);
    setFormData({ ...formData, feesAmount: numValue });
  };
  
  // 🔸 معالجة إدخال المبلغ النهائي (وضع نهائي → معامل)
  const handleFinalAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setFinalAmountDisplay(cleanValue);
    const finalAmount = parseFormattedNumber(cleanValue);
    
    if (formData.amount > 0 && finalAmount > 0) {
      let factor: number;
      if (formData.conversionMethod === 'MULTIPLY') {
        factor = finalAmount / formData.amount;
      } else {
        factor = formData.amount / finalAmount;
      }
      setFormData(prev => ({ ...prev, conversionFactor: factor }));
      setConversionFactorDisplay(formatInputNumber(factor));
    }
  };
  
  // SYP version is always OLD - no toggle needed
  // const handleAmountSYPVersionChange = (version: 'NEW' | 'OLD') => { ... }
  
  const handleSubmit = async () => {
    if (!formData.accountId || !formData.currencyId || !formData.date) {
      return;
    }
    
    // 🔸 تحديد حالة الاكتمال تلقائيًا
    // الحركة غير مكتملة إذا: لا يوجد مبلغ أساسي، أو لا يوجد معامل تحويل، أو الرصيد النهائي = 0 أو فارغ
    const isIncomplete = !formData.conversionFactor || formData.conversionFactor === 0 
      || !formData.amount || formData.amount === 0
      || !calculatedBalance || calculatedBalance === 0;
    const submitIsComplete = !isIncomplete;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      if (editingTransaction) {
        // Update existing transaction
        const result = await updateTransaction(editingTransaction.id, {
          accountId: formData.accountId,
          currencyId: formData.currencyId,
          baseCurrencyId: formData.baseCurrencyId,
          type: formData.type,
          paymentType: formData.paymentType,
          amount: formData.amount,
          conversionFactor: formData.conversionFactor,
          conversionMethod: formData.conversionMethod,
          feesType: formData.feesType,
          feesDirection: formData.feesDirection,
          ...(formData.feesCurrencyId ? { feesCurrencyId: formData.feesCurrencyId } : {}),
          feesAmount: formData.feesAmount,
          description: formData.description,
          date: formData.date,
          isComplete: submitIsComplete,
        });
        
        if (result.success) {
          closeTransactionModal();
        } else {
          setErrorMessage(result.error || 'فشل في تحديث الحركة');
        }
      } else {
        // Create new transaction
        const result = await addTransaction({
          accountId: formData.accountId,
          currencyId: formData.currencyId,
          baseCurrencyId: formData.baseCurrencyId,
          type: formData.type,
          paymentType: formData.paymentType,
          amount: formData.amount,
          conversionFactor: formData.conversionFactor,
          conversionMethod: formData.conversionMethod,
          feesType: formData.feesType,
          feesDirection: formData.feesDirection,
          ...(formData.feesCurrencyId ? { feesCurrencyId: formData.feesCurrencyId } : {}),
          feesAmount: formData.feesAmount,
          description: formData.description,
          date: formData.date,
          isComplete: submitIsComplete,
        });
        
        if (result.success) {
          closeTransactionModal();
        } else {
          setErrorMessage(result.error || 'فشل في إنشاء الحركة');
        }
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      setErrorMessage('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get conversion preview text
  const conversionPreview = useMemo(() => {
    if (isSameCurrency || formData.conversionFactor === 0) return null;
    
    const baseAmount = 1;
    let convertedAmount = baseAmount;
    
    if (formData.conversionMethod === 'MULTIPLY') {
      convertedAmount = baseAmount * formData.conversionFactor;
    } else {
      convertedAmount = baseAmount / formData.conversionFactor;
    }
    
    return {
      base: baseAmount,
      converted: convertedAmount,
    };
  }, [formData.conversionFactor, formData.conversionMethod, isSameCurrency]);

  // Vault effect description
  const getVaultEffectDescription = () => {
    if (formData.paymentType === 'DEFERRED') {
      return { text: 'لا يؤثر على الصندوق (آجل)', color: 'text-amber-600' };
    }
    
    if (formData.type === 'EXPENSE') {
      // علينا - كاش = نستلم المبلغ (زيادة في الصندوق)
      return { text: `زيادة في صندوق ${targetCurrency?.symbol || ''}`, color: 'text-emerald-600' };
    } else {
      // لنا - كاش = ندفع المبلغ (خصم من الصندوق)
      return { text: `خصم من صندوق ${targetCurrency?.symbol || ''}`, color: 'text-red-600' };
    }
  };
  
  const vaultEffect = getVaultEffectDescription();

  return (
    <Dialog open={isTransactionModalOpen} onOpenChange={closeTransactionModal}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingTransaction ? 'تعديل الحركة' : 'إضافة حركة جديدة'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Transaction Direction (لنا / علينا) */}
          <div className="space-y-2">
            <Label>اتجاه الحركة</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.type === 'INCOME'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <ArrowUpRight className="w-6 h-6" />
                <span className="text-base">لنا</span>
                <span className="text-[10px] opacity-70">مبلغ علينا استلامه</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.type === 'EXPENSE'
                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:border-red-600 dark:text-red-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <ArrowDownRight className="w-6 h-6" />
                <span className="text-base">علينا</span>
                <span className="text-[10px] opacity-70">مبلغ علينا دفعه</span>
              </button>
            </div>
          </div>
          
          {/* Payment Type (كاش / آجل) */}
          <div className="space-y-2">
            <Label>نوع الدفع</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentType: 'CASH' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.paymentType === 'CASH'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/30 dark:border-blue-600 dark:text-blue-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <Banknote className="w-6 h-6" />
                <span className="text-base">كاش</span>
                <span className="text-[10px] opacity-70">يؤثر على الصندوق</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentType: 'DEFERRED' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.paymentType === 'DEFERRED'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <Clock className="w-6 h-6" />
                <span className="text-base">آجل</span>
                <span className="text-[10px] opacity-70">لا يؤثر على الصندوق</span>
              </button>
            </div>
            
            {/* Vault Effect Indicator */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${formData.type}-${formData.paymentType}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm',
                  formData.paymentType === 'DEFERRED' 
                    ? 'bg-amber-50 dark:bg-amber-950/20' 
                    : formData.type === 'EXPENSE' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20'
                      : 'bg-red-50 dark:bg-red-950/20'
                )}
              >
                <Wallet className="w-4 h-4" />
                <span className={vaultEffect.color}>{vaultEffect.text}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Account Selection */}
          <div className="space-y-2">
            <Label>الحساب</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="اختر الحساب" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount Section - Dual Currency */}
          <div className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Coins className="w-4 h-4" />
              <span>المبلغ والتحويل</span>
            </div>
            
            {/* Base Amount Row */}
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-2 space-y-2">
                <Label>المبلغ الأساسي</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-left font-mono text-lg h-12"
                  dir="ltr"
                />
                {isBaseSYP && (
                  <div className="flex gap-1">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      ل.س قديم
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>عملة المبلغ</Label>
                <Select
                  value={formData.baseCurrencyId || ''}
                  onValueChange={(value) => setFormData({ ...formData, baseCurrencyId: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.symbol} {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Conversion Section (show only if different currencies) */}
            {!isSameCurrency && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {/* 🔸 Input Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">طريقة الإدخال:</span>
                  <button
                    type="button"
                    onClick={() => setInputMode('FACTOR_TO_FINAL')}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium transition-all',
                      inputMode === 'FACTOR_TO_FINAL'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    معامل → نهائي
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('FINAL_TO_FACTOR')}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium transition-all',
                      inputMode === 'FINAL_TO_FACTOR'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    نهائي → معامل
                  </button>
                </div>
                
                {/* Conversion Factor */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>معامل التحويل</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={conversionFactorDisplay}
                      onChange={(e) => handleConversionFactorChange(e.target.value)}
                      className="text-left font-mono h-10"
                      dir="ltr"
                      readOnly={inputMode === 'FINAL_TO_FACTOR'}
                    />
                  </div>
                  <div className="flex gap-1 mt-6">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, conversionMethod: 'MULTIPLY' })}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        formData.conversionMethod === 'MULTIPLY'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, conversionMethod: 'DIVIDE' })}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        formData.conversionMethod === 'DIVIDE'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      ÷
                    </button>
                  </div>
                </div>
                
                {/* 🔸 Final Amount Input (only in FINAL_TO_FACTOR mode) */}
                {inputMode === 'FINAL_TO_FACTOR' && (
                  <div className="space-y-2">
                    <Label>المبلغ النهائي ({targetCurrency?.symbol})</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={finalAmountDisplay}
                      onChange={(e) => handleFinalAmountChange(e.target.value)}
                      placeholder="أدخل المبلغ النهائي"
                      className="text-left font-mono h-10"
                      dir="ltr"
                    />
                    {/* 🔸 تنبيه عند عدم إدخال الرصيد النهائي */}
                    {(!finalAmountDisplay || parseFormattedNumber(finalAmountDisplay) === 0) && formData.accountId && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        عدم إدخال الرصيد النهائي سيجعل الحركة غير مكتملة
                      </p>
                    )}
                  </div>
                )}
                
                {/* SYP Rate Note */}
                {isSYPInvolved && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    معامل التحويل بالإصدار القديم
                  </p>
                )}
                
                {/* Conversion Preview */}
                {conversionPreview && formData.conversionFactor !== 1 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                    <RefreshCcw className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-700 dark:text-blue-300">
                      1 {baseCurrency?.code} = {formatNumber(isTargetSYP ? conversionPreview.converted : conversionPreview.converted, 4)} {targetCurrency?.symbol}
                    </span>
                  </div>
                )}
                
                {/* Converted Amount Preview */}
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(formData.amount)} {baseCurrency?.symbol}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatNumber(convertedAmount)} {targetCurrency?.symbol}
                  </span>
                </div>
              </motion.div>
            )}
            
            {/* Target Currency */}
            <div className="space-y-2">
              <Label>العملة النهائية (للتسجيل)</Label>
              <Select
                value={formData.currencyId}
                onValueChange={(value) => setFormData({ ...formData, currencyId: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.name} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Fees Section */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calculator className="w-4 h-4" />
              <span>الأجور (اختياري)</span>
            </div>
            
            {/* Fees Amount & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>قيمة الأجور</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={feesAmountDisplay}
                  onChange={(e) => handleFeesAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-left font-mono h-10"
                  dir="ltr"
                />
              </div>
              
              <div className="space-y-2">
                <Label>نوع الأجور</Label>
                <Select
                  value={formData.feesType}
                  onValueChange={(value: 'FIXED' | 'PERCENTAGE' | 'PER_THOUSAND') => 
                    setFormData({ ...formData, feesType: value })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">مبلغ ثابت</SelectItem>
                    <SelectItem value="PERCENTAGE">نسبة %</SelectItem>
                    <SelectItem value="PER_THOUSAND">من ألف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Fees Direction */}
            <div className="space-y-2">
              <Label>اتجاه الأجور</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feesDirection: 'INCOME' })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1',
                    formData.feesDirection === 'INCOME'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  )}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  لنا
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feesDirection: 'EXPENSE' })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1',
                    formData.feesDirection === 'EXPENSE'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  علينا
                </button>
              </div>
            </div>
            
            {/* Fees Preview */}
            {formData.feesAmount > 0 && (
              <div className={cn(
                'rounded-lg p-2 text-sm flex items-center justify-between',
                formData.feesDirection === 'INCOME'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20'
                  : 'bg-red-50 dark:bg-red-950/20'
              )}>
                <span className="text-muted-foreground">قيمة الأجور:</span>
                <span className={cn(
                  'font-medium',
                  formData.feesDirection === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {formData.feesDirection === 'INCOME' ? '+' : '-'}{formatNumber(feesValue)} {targetCurrency?.symbol}
                </span>
              </div>
            )}
          </div>
          
          {/* Date */}
          <div className="space-y-2">
            <Label>التاريخ</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="h-12"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>البيان (اختياري)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>
          
          {/* Final Balance Display */}
          <div className={cn(
            'rounded-xl p-5 border-2',
            formData.type === 'INCOME' 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' 
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          )}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">الرصيد النهائي</p>
              <div className="flex items-center gap-1">
                {formData.paymentType === 'DEFERRED' ? (
                  <Clock className="w-4 h-4 text-amber-500" />
                ) : (
                  <Banknote className={cn(
                    'w-4 h-4',
                    formData.type === 'EXPENSE' ? 'text-emerald-500' : 'text-red-500'
                  )} />
                )}
                <span className="text-xs text-muted-foreground">
                  {formData.paymentType === 'DEFERRED' ? 'آجل' : 'كاش'}
                </span>
              </div>
            </div>
            <p className={cn(
              'text-3xl font-bold font-mono',
              formData.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
            )} dir="ltr">
              {formatNumber(calculatedBalance)} {targetCurrency?.symbol}
            </p>
            {isTargetSYP && (
              <p className="text-[10px] text-muted-foreground mt-1">{formatSYPDualDisplay(calculatedBalance)}</p>
            )}
            {!isSameCurrency && formData.amount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                = {formatNumber(formData.amount)} {baseCurrency?.symbol}
              </p>
            )}
            {isBaseSYP && !isSameCurrency && formData.amount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatSYPDualDisplay(formData.amount)}</p>
            )}
          </div>
          
          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      لا يمكن إتمام العملية
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Submit Button */}
          {/* 🔸 تحذير الحالة غير المكتملة */}
          {(!formData.conversionFactor || formData.conversionFactor === 0 || !formData.amount || formData.amount === 0 || !calculatedBalance || calculatedBalance === 0) && formData.accountId && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                {(!calculatedBalance || calculatedBalance === 0) && formData.amount > 0
                  ? 'الحركة غير مكتملة بسبب عدم إدخال الرصيد النهائي'
                  : 'سيتم حفظ الحركة كـ "غير مكتملة" حتى يتم استكمال البيانات'
                }
              </span>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.accountId}
            className={cn(
              "w-full h-14 text-base font-medium",
              (!formData.conversionFactor || formData.conversionFactor === 0 || !formData.amount || formData.amount === 0 || !calculatedBalance || calculatedBalance === 0)
                ? 'bg-amber-500 hover:bg-amber-600'
                : formData.type === 'INCOME' 
                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                  : 'bg-red-500 hover:bg-red-600'
            )}
          >
            {isSubmitting ? 'جاري الحفظ...' : (!formData.conversionFactor || formData.conversionFactor === 0 || !formData.amount || formData.amount === 0 || !calculatedBalance || calculatedBalance === 0) ? 'حفظ كغير مكتملة' : 'حفظ الحركة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
