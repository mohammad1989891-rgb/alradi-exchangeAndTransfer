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
import { format } from 'date-fns';
import { CreditCard, ArrowUpRight, ArrowDownRight, Banknote, Clock, RefreshCcw, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { isSYPCurrency, formatSYPDualDisplay } from '@/lib/syp-conversion';
import type { Debt, DebtPayment } from '@/lib/supabaseDb';

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

interface EditMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: {
    type: 'DEBT' | 'PAYMENT';
    originalData: Debt | DebtPayment;
    direction: 'RECEIVABLE' | 'PAYABLE';
    mode: 'CASH' | 'DEFERRED';
  } | null;
  onSaved: () => Promise<void>;
}

export function EditMovementModal({ isOpen, onClose, movement, onSaved }: EditMovementModalProps) {
  const { accounts, currencies } = useAppStore();
  const { editDebtWithVaultReversal, editDebtPaymentWithVaultReversal } = useSupabaseData();

  // Debt form state
  const [debtType, setDebtType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [debtMode, setDebtMode] = useState<'CASH' | 'DEFERRED'>('DEFERRED');
  const [accountId, setAccountId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [conversionFactorDisplay, setConversionFactorDisplay] = useState('1');
  const [conversionMethod, setConversionMethod] = useState<'MULTIPLY' | 'DIVIDE'>('MULTIPLY');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');

  // Payment form state
  const [paymentDirection, setPaymentDirection] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'DEFERRED'>('CASH');
  const [paymentCurrencyId, setPaymentCurrencyId] = useState('');
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentDescription, setPaymentDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedBalance, setCalculatedBalance] = useState(0);

  // Reset form when modal opens with movement data
  useEffect(() => {
    if (isOpen && movement) {
      if (movement.type === 'DEBT') {
        const debt = movement.originalData as Debt;
        setDebtType(debt.debtType || 'RECEIVABLE');
        setDebtMode(debt.debtMode || 'DEFERRED');
        setAccountId(debt.accountId);
        setCurrencyId(debt.currencyId);
        setAmountDisplay(formatInputNumber(debt.amount));
        setConversionFactorDisplay(formatInputNumber(debt.conversionFactor));
        setConversionMethod(debt.conversionMethod);
        setDate(format(new Date(debt.date), 'yyyy-MM-dd'));
        setDescription(debt.description || '');
      } else {
        const payment = movement.originalData as DebtPayment;
        setPaymentDirection(payment.paymentDirection || movement.direction);
        setPaymentMode(payment.paymentMode || 'CASH');
        setPaymentCurrencyId(payment.currencyId);
        setPaymentAmountDisplay(formatInputNumber(payment.amount));
        setPaymentDate(format(new Date(payment.date), 'yyyy-MM-dd'));
        setPaymentDescription(payment.description || '');
      }
    }
  }, [isOpen, movement]);

  // Calculate final balance for debt
  useEffect(() => {
    if (movement?.type !== 'DEBT') return;
    const amount = parseFormattedNumber(amountDisplay);
    const factor = parseFormattedNumber(conversionFactorDisplay) || 1;
    let balance = amount;
    if (conversionMethod === 'MULTIPLY') {
      balance = amount * factor;
    } else {
      balance = amount / factor;
    }
    setCalculatedBalance(balance);
  }, [amountDisplay, conversionFactorDisplay, conversionMethod, movement?.type]);

  // Handle amount input with formatting
  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setAmountDisplay(cleanValue);
  };

  const handleConversionFactorChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setConversionFactorDisplay(cleanValue);
  };

  const handlePaymentAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    setPaymentAmountDisplay(cleanValue);
  };

  const handleSubmit = async () => {
    if (!movement) return;

    setIsSubmitting(true);
    try {
      if (movement.type === 'DEBT') {
        const amount = parseFormattedNumber(amountDisplay);
        const conversionFactor = parseFormattedNumber(conversionFactorDisplay) || 1;
        if (!accountId || !currencyId || !amount || !date) {
          return;
        }
        await editDebtWithVaultReversal(movement.originalData.id, {
          accountId,
          currencyId,
          amount,
          conversionFactor,
          conversionMethod,
          description: description || null,
          date,
          debtType,
          debtMode,
        });
      } else {
        const amount = parseFormattedNumber(paymentAmountDisplay);
        if (!paymentCurrencyId || !amount || !paymentDate) {
          return;
        }
        await editDebtPaymentWithVaultReversal(movement.originalData.id, {
          amount,
          currencyId: paymentCurrencyId,
          description: paymentDescription || null,
          date: paymentDate,
          paymentMode: paymentMode,
          paymentDirection: paymentDirection,
        });
      }

      await onSaved();
      onClose();
    } catch (error) {
      console.error('Error editing movement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCurrency = currencies.find(c => c.id === currencyId);
  const isDebtSYP = isSYPCurrency(currencyId, selectedCurrency?.code);
  const selectedPaymentCurrency = currencies.find(c => c.id === paymentCurrencyId);
  const selectedAccount = accounts.find(a => a.id === accountId);

  // Conversion preview
  const getConversionPreview = () => {
    if (movement?.type !== 'DEBT') return null;
    const factor = parseFormattedNumber(conversionFactorDisplay) || 1;
    if (!factor || factor === 1) return null;

    let convertedAmount = 1;
    if (conversionMethod === 'MULTIPLY') {
      convertedAmount = factor;
    } else {
      convertedAmount = 1 / factor;
    }
    return { base: 1, converted: convertedAmount };
  };

  const conversionPreview = getConversionPreview();

  if (!movement) return null;

  const isDebt = movement.type === 'DEBT';
  const currentDirection = isDebt ? debtType : paymentDirection;
  const currentMode = isDebt ? debtMode : paymentMode;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {isDebt ? (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            ) : (
              <CreditCard className="w-5 h-5 text-teal-500" />
            )}
            تعديل {isDebt ? 'الدين' : 'الدفعة'}
          </DialogTitle>
        </DialogHeader>

        {/* Account Info Header - matching MultiCurrencyPaymentModal style */}
        {isDebt && selectedAccount && (
          <div className="rounded-xl p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                currentDirection === 'RECEIVABLE'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {currentDirection === 'RECEIVABLE'
                  ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  : <ArrowDownRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <p className="font-bold text-foreground">{selectedAccount.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    currentDirection === 'RECEIVABLE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  )}>
                    {currentDirection === 'RECEIVABLE' ? 'لنا' : 'علينا'}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    currentMode === 'CASH'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  )}>
                    {currentMode === 'CASH' ? 'نقدي' : 'آجل'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isDebt && (
          <div className="rounded-xl p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                paymentDirection === 'RECEIVABLE'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {paymentDirection === 'RECEIVABLE'
                  ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  : <ArrowDownRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <p className="font-bold text-foreground">دفعة سداد</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    paymentDirection === 'RECEIVABLE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  )}>
                    {paymentDirection === 'RECEIVABLE' ? 'لنا' : 'علينا'}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    paymentMode === 'CASH'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  )}>
                    {paymentMode === 'CASH' ? 'نقدي' : 'آجل'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDebt ? (
          /* ===== Debt Edit Form - matching MultiCurrencyPaymentModal style ===== */
          <div className="space-y-4 mt-2">
            {/* Direction Selection - matching payment modal toggle style */}
            <div className="space-y-2">
              <Label>نوع الدين</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDebtType('RECEIVABLE')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    debtType === 'RECEIVABLE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>لنا</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('PAYABLE')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    debtType === 'PAYABLE'
                      ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:border-red-600 dark:text-red-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <ArrowDownRight className="w-5 h-5" />
                  <span>علينا</span>
                </button>
              </div>
            </div>

            {/* Mode Selection - matching payment modal toggle style */}
            <div className="space-y-2">
              <Label>طريقة الدين</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDebtMode('CASH')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    debtMode === 'CASH'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/30 dark:border-teal-600 dark:text-teal-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Banknote className="w-5 h-5" />
                  <span>نقدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDebtMode('DEFERRED')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    debtMode === 'DEFERRED'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/30 dark:border-purple-600 dark:text-purple-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Clock className="w-5 h-5" />
                  <span>آجل</span>
                </button>
              </div>
              {/* Cash mode explanation - matching payment modal */}
              {debtMode === 'CASH' && (
                <div className={cn(
                  'mt-2 p-3 rounded-lg text-sm',
                  debtType === 'PAYABLE'
                    ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                )}>
                  {debtType === 'PAYABLE'
                    ? '✓ سيتم زيادة رصيد الصندوق بهذا المبلغ'
                    : '✓ سيتم خصم هذا المبلغ من الصندوق'
                  }
                </div>
              )}
            </div>

            {/* Account - matching payment modal select style */}
            <div className="space-y-2">
              <Label>الحساب</Label>
              <Select value={accountId} onValueChange={setAccountId}>
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

            {/* Amount & Currency Row - matching payment modal style */}
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-left font-mono text-lg"
                  dir="ltr"
                />
                {selectedCurrency && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {selectedCurrency.symbol}
                  </span>
                )}
              </div>
              {isDebtSYP && (
                <div className="flex gap-1">
                  <span className="flex-1 py-1.5 rounded-md text-xs font-medium text-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    ل.س قديم
                  </span>
                </div>
              )}
            </div>

            {/* Currency Selector - matching payment modal */}
            <div className="space-y-2">
              <Label>العملة</Label>
              <Select
                value={currencyId}
                onValueChange={(value) => {
                  setCurrencyId(value);
                  if (parseFormattedNumber(amountDisplay)) {
                    setAmountDisplay(formatInputNumber(parseFormattedNumber(amountDisplay)));
                  }
                }}
              >
                <SelectTrigger>
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
                    onClick={() => setConversionMethod('MULTIPLY')}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium transition-all',
                      conversionMethod === 'MULTIPLY'
                        ? 'bg-amber-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    ضرب ×
                  </button>
                  <button
                    type="button"
                    onClick={() => setConversionMethod('DIVIDE')}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium transition-all',
                      conversionMethod === 'DIVIDE'
                        ? 'bg-amber-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    قسمة ÷
                  </button>
                </div>
              </div>
              {conversionPreview && parseFormattedNumber(conversionFactorDisplay) !== 1 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                  <RefreshCcw className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    1 {selectedCurrency?.code || 'وحدة'} = {formatNumber(conversionPreview.converted, 6)} {selectedCurrency?.symbol}
                  </span>
                </div>
              )}
            </div>

            {/* Date - matching payment modal */}
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Description - matching payment modal */}
            <div className="space-y-2">
              <Label>البيان</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>

            {/* Calculated Balance Preview */}
            <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-950/20">
              <p className="text-xs text-muted-foreground mb-1">الرصيد النهائي</p>
              <p className="text-2xl font-bold text-amber-600 font-mono" dir="ltr">
                {formatNumber(calculatedBalance)} {selectedCurrency?.symbol}
              </p>
              {isDebtSYP && (
                <p className="text-[10px] text-muted-foreground mt-1">{formatSYPDualDisplay(calculatedBalance)}</p>
              )}
            </div>

            {/* Vault reversal notice */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ⚠️ سيتم عكس تأثير الحركة القديمة على الصندوق ثم تطبيق القيم الجديدة
              </p>
            </div>

            {/* Action Buttons - matching payment modal style */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !accountId || !parseFormattedNumber(amountDisplay)}
                className="flex-1 h-12 text-base bg-amber-500 hover:bg-amber-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-12 px-4"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* ===== Payment Edit Form - matching MultiCurrencyPaymentModal style ===== */
          <div className="space-y-4 mt-2">
            {/* Direction Selection - matching payment modal toggle style */}
            <div className="space-y-2">
              <Label>اتجاه الدفعة</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentDirection('RECEIVABLE')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    paymentDirection === 'RECEIVABLE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>لنا</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentDirection('PAYABLE')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    paymentDirection === 'PAYABLE'
                      ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:border-red-600 dark:text-red-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <ArrowDownRight className="w-5 h-5" />
                  <span>علينا</span>
                </button>
              </div>
            </div>

            {/* Payment Mode Selection - matching payment modal toggle style */}
            <div className="space-y-2">
              <Label>نوع الدفع</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    paymentMode === 'CASH'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/30 dark:border-teal-600 dark:text-teal-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Banknote className="w-5 h-5" />
                  <span>نقدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('DEFERRED')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    paymentMode === 'DEFERRED'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/30 dark:border-purple-600 dark:text-purple-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Clock className="w-5 h-5" />
                  <span>آجل</span>
                </button>
              </div>
              {/* Cash mode explanation - matching payment modal */}
              {paymentMode === 'CASH' && (
                <div className={cn(
                  'mt-2 p-3 rounded-lg text-sm',
                  paymentDirection === 'PAYABLE'
                    ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                )}>
                  {paymentDirection === 'PAYABLE'
                    ? '✓ سيتم زيادة رصيد الصندوق بهذا المبلغ'
                    : '✓ سيتم خصم هذا المبلغ من الصندوق'
                  }
                </div>
              )}
            </div>

            {/* Amount - matching payment modal style with currency symbol overlay */}
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={paymentAmountDisplay}
                  onChange={(e) => handlePaymentAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-left font-mono text-lg"
                  dir="ltr"
                />
                {selectedPaymentCurrency && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {selectedPaymentCurrency.symbol}
                  </span>
                )}
              </div>
            </div>

            {/* Currency Selector - matching payment modal */}
            <div className="space-y-2">
              <Label>العملة</Label>
              <Select
                value={paymentCurrencyId}
                onValueChange={setPaymentCurrencyId}
              >
                <SelectTrigger>
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

            {/* Date - matching payment modal */}
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {/* Description - matching payment modal */}
            <div className="space-y-2">
              <Label>البيان</Label>
              <Textarea
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>

            {/* Amount preview */}
            <div className="rounded-xl p-4 bg-teal-50 dark:bg-teal-950/20">
              <p className="text-xs text-muted-foreground mb-1">المبلغ</p>
              <p className="text-2xl font-bold text-teal-600 font-mono" dir="ltr">
                {formatNumber(parseFormattedNumber(paymentAmountDisplay))} {selectedPaymentCurrency?.symbol}
              </p>
            </div>

            {/* Vault reversal notice */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ⚠️ سيتم عكس تأثير الحركة القديمة على الصندوق ثم تطبيق القيم الجديدة
              </p>
            </div>

            {/* Action Buttons - matching payment modal style */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !paymentCurrencyId || !parseFormattedNumber(paymentAmountDisplay)}
                className="flex-1 h-12 text-base bg-amber-500 hover:bg-amber-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-12 px-4"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
