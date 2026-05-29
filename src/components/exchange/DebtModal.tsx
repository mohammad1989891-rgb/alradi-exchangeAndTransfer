'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
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
import { formatNumber } from '@/lib/format';
import type { DebtFormData } from '@/types';
import { format } from 'date-fns';
import { AlertCircle, RefreshCcw, ArrowUpRight, ArrowDownRight, Banknote, Clock } from 'lucide-react';
import { isSYPCurrency, formatSYPDualDisplay } from '@/lib/syp-conversion';

// Helper function to format number with thousand separator for input
function formatInputNumber(num: number | string): string {
  if (num === '' || num === null || num === undefined) return '';
  const str = String(num).replace(/,/g, '');
  if (isNaN(parseFloat(str))) return '';
  
  // Split by decimal point
  const parts = str.split('.');
  // Format integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Helper function to parse formatted number
function parseFormattedNumber(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

const defaultFormData: DebtFormData = {
  accountId: '',
  currencyId: '',
  amount: 0,
  conversionFactor: 1,
  conversionMethod: 'MULTIPLY',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  debtType: 'RECEIVABLE',  // افتراضياً لنا
  debtMode: 'DEFERRED',    // افتراضياً آجل
};

export function DebtModal() {
  const {
    isDebtModalOpen,
    closeDebtModal,
    editingDebt,
    accounts,
    currencies,
  } = useAppStore();
  
  const { addDebt } = useSupabaseData();
  
  const [formData, setFormData] = useState<DebtFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  
  // Formatted display values
  const [amountDisplay, setAmountDisplay] = useState('');
  const [conversionFactorDisplay, setConversionFactorDisplay] = useState('1');
  // SYP version support - دائماً الإصدار القديم (لا حاجة لـ state)
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isDebtModalOpen) {
      if (editingDebt) {
        const editingCurrency = currencies.find(c => c.id === editingDebt.currencyId);
        const isEditingSYP = isSYPCurrency(editingDebt.currencyId, editingCurrency?.code);
        // Always display in OLD version (stored value)
        const displayAmount = editingDebt.amount;
        setFormData({
          accountId: editingDebt.accountId,
          currencyId: editingDebt.currencyId,
          amount: editingDebt.amount,
          conversionFactor: editingDebt.conversionFactor,
          conversionMethod: editingDebt.conversionMethod,
          description: editingDebt.description || '',
          date: format(new Date(editingDebt.date), 'yyyy-MM-dd'),
          debtType: editingDebt.debtType || 'RECEIVABLE',
          debtMode: editingDebt.debtMode || 'DEFERRED',
        });
        setAmountDisplay(formatInputNumber(displayAmount));
        setConversionFactorDisplay(formatInputNumber(editingDebt.conversionFactor));
      } else {
        // Set default currency
        const defaultCurrency = currencies.find(c => c.isDefault);
        setFormData({
          ...defaultFormData,
          currencyId: defaultCurrency?.id || currencies[0]?.id || '',
          date: format(new Date(), 'yyyy-MM-dd'),
        });
        setAmountDisplay('');
        setConversionFactorDisplay('1');
      }
    }
  }, [isDebtModalOpen, editingDebt, currencies]);
  
  // Calculate final balance
  useEffect(() => {
    let balance = formData.amount;
    
    if (formData.conversionMethod === 'MULTIPLY') {
      balance = formData.amount * formData.conversionFactor;
    } else {
      balance = formData.amount / formData.conversionFactor;
    }
    
    setCalculatedBalance(balance);
  }, [formData]);
  
  // Handle amount input with formatting
  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setAmountDisplay(cleanValue);
    const numValue = parseFormattedNumber(cleanValue);
    // All SYP inputs use OLD version = stored value directly (no conversion needed)
    const storedAmount = numValue;
    setFormData({ ...formData, amount: storedAmount });
  };
  
  // Handle conversion factor input with formatting
  const handleConversionFactorChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setConversionFactorDisplay(cleanValue);
    const numValue = parseFormattedNumber(cleanValue) || 1;
    setFormData({ ...formData, conversionFactor: numValue });
  };
  
  const handleSubmit = async () => {
    if (!formData.accountId || !formData.currencyId || !formData.amount || !formData.date) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addDebt({
        accountId: formData.accountId,
        currencyId: formData.currencyId,
        amount: formData.amount,
        conversionFactor: formData.conversionFactor,
        conversionMethod: formData.conversionMethod,
        description: formData.description,
        date: formData.date,
        debtType: formData.debtType || 'RECEIVABLE',
        debtMode: formData.debtMode || 'DEFERRED',
      });
      closeDebtModal();
    } catch (error) {
      console.error('Error creating debt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedCurrency = currencies.find(c => c.id === formData.currencyId);
  const isDebtSYP = isSYPCurrency(formData.currencyId, selectedCurrency?.code);
  
  // Calculate conversion preview
  const getConversionPreview = () => {
    if (!formData.conversionFactor || formData.conversionFactor === 0) return null;
    
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
  };
  
  const conversionPreview = getConversionPreview();
  
  return (
    <Dialog open={isDebtModalOpen} onOpenChange={closeDebtModal}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            {editingDebt ? 'تعديل الدين' : 'إضافة دين جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Debt Type Selection */}
          <div className="space-y-2">
            <Label>نوع الدين</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, debtType: 'RECEIVABLE' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.debtType === 'RECEIVABLE' || !formData.debtType
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <ArrowUpRight className="w-6 h-6" />
                <span className="text-base">لنا</span>
                <span className="text-[10px] opacity-70">مستحق لنا من الآخرين</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, debtType: 'PAYABLE' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.debtType === 'PAYABLE'
                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:border-red-600 dark:text-red-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <ArrowDownRight className="w-6 h-6" />
                <span className="text-base">علينا</span>
                <span className="text-[10px] opacity-70">مستحق علينا للآخرين</span>
              </button>
            </div>
          </div>
          
          {/* Debt Mode Selection (Cash / Deferred) */}
          <div className="space-y-2">
            <Label>طريقة الدين</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, debtMode: 'CASH' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.debtMode === 'CASH'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/30 dark:border-blue-600 dark:text-blue-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <Banknote className="w-6 h-6" />
                <span className="text-base">نقدي</span>
                <span className="text-[10px] opacity-70">يؤثر على الصندوق</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, debtMode: 'DEFERRED' })}
                className={cn(
                  'py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 border-2',
                  formData.debtMode === 'DEFERRED' || !formData.debtMode
                    ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/30 dark:border-purple-600 dark:text-purple-400'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <Clock className="w-6 h-6" />
                <span className="text-base">آجل</span>
                <span className="text-[10px] opacity-70">لا يؤثر على الصندوق</span>
              </button>
            </div>
            {/* Cash mode explanation */}
            {formData.debtMode === 'CASH' && (
              <div className={cn(
                'mt-2 p-3 rounded-lg text-sm',
                formData.debtType === 'PAYABLE'
                  ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
              )}>
                {formData.debtType === 'PAYABLE' 
                  ? '✓ سيتم زيادة رصيد الصندوق بهذا المبلغ'
                  : '✓ سيتم خصم هذا المبلغ من الصندوق'
                }
              </div>
            )}
          </div>
          
          {/* Account */}
          <div className="space-y-2">
            <Label>الحساب</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger>
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
          
          {/* Amount & Currency Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="text-left font-mono"
                dir="ltr"
              />
              {isDebtSYP && (
                <div className="flex gap-1">
                  <span className="flex-1 py-1.5 rounded-md text-xs font-medium text-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    ل.س قديم
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>العملة</Label>
              <Select
                value={formData.currencyId}
                onValueChange={(value) => {
                  setFormData({ ...formData, currencyId: value });
                  if (formData.amount) {
                    // Always display stored value (OLD)
                    setAmountDisplay(formatInputNumber(formData.amount));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
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
          
          {/* Conversion Factor Row */}
          <div className="space-y-2">
            <Label>معامل التحويل</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={conversionFactorDisplay}
                  onChange={(e) => handleConversionFactorChange(e.target.value)}
                  className="text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, conversionMethod: 'MULTIPLY' })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all',
                    formData.conversionMethod === 'MULTIPLY'
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  ضرب ×
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, conversionMethod: 'DIVIDE' })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all',
                    formData.conversionMethod === 'DIVIDE'
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  قسمة ÷
                </button>
              </div>
            </div>
            
            {/* Conversion Preview */}
            {conversionPreview && formData.conversionFactor !== 1 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <RefreshCcw className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  1 {selectedCurrency?.code || 'وحدة'} = {formatNumber(conversionPreview.converted, 6)} {selectedCurrency?.symbol}
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
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>البيان</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>
          
          {/* Calculated Balance */}
          <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-950/20">
            <p className="text-xs text-muted-foreground mb-1">الرصيد النهائي</p>
            <p className="text-2xl font-bold text-amber-600 font-mono" dir="ltr">
              {formatNumber(calculatedBalance)} {selectedCurrency?.symbol}
            </p>
            {isDebtSYP && (
              <p className="text-[10px] text-muted-foreground mt-1">{formatSYPDualDisplay(calculatedBalance)}</p>
            )}
          </div>
          
          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.accountId || !formData.amount}
            className="w-full h-12 text-base bg-amber-500 hover:bg-amber-600"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الدين'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
