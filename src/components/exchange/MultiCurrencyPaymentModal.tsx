'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Banknote,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  DollarSign,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Debt, DebtPayment } from '@/lib/supabaseDb';

// ============================================
// Types
// ============================================

interface CumulativeAccountSummary {
  accountId: string;
  account?: { name: string };
  netCashBalance: number;
  cashDebts: Debt[];
  deferredDebts: Debt[];
  cumulativeCashReceivable: number;
  cumulativeCashPayable: number;
  cumulativeCashPaid: number;
  cumulativeCashRemaining: number;
  primaryDebtMode: 'CASH' | 'DEFERRED';
  [key: string]: unknown;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  exchangeRate: number;
  conversionMethod: string;
}

interface CurrencyAllocation {
  currencyId: string;
  selected: boolean;
  exchangeRate: number;
  allocatedAmount: number; // amount in payment currency
  remainingDebt: number;   // remaining debt in this currency (USD equivalent)
}

interface MultiCurrencyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountSummary: CumulativeAccountSummary | null;
  currencies: Currency[];
  debtPayments: DebtPayment[];
  onAddDebtPayment: (params: {
    debtId: string;
    amount: number;
    currencyId: string;
    description?: string;
    date: string;
    paymentMode?: 'CASH' | 'DEFERRED';
    direction?: 'RECEIVABLE' | 'PAYABLE';
    currentBalance?: number;
  }) => Promise<{ id: string }>;
  onAddTransaction: (params: {
    accountId: string;
    currencyId: string;
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
  }) => Promise<{ success: boolean; data?: { id: string } }>;
  onUpdateDebtPayment: (id: string, data: { overflowTransactionId: string }) => Promise<void>;
  onPaymentComplete: () => Promise<void>;
  getRemainingForDebt: (debt: Debt) => number;
  getPaidAmountForDebt: (debtId: string) => number;
}

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

// ============================================
// Component
// ============================================

export function MultiCurrencyPaymentModal({
  isOpen,
  onClose,
  accountSummary,
  currencies,
  debtPayments,
  onAddDebtPayment,
  onAddTransaction,
  onUpdateDebtPayment,
  onPaymentComplete,
  getRemainingForDebt,
  getPaidAmountForDebt,
}: MultiCurrencyPaymentModalProps) {
  const { toast } = useToast();

  // Form state - Input State (only updated by user actions)
  const [paymentCurrencyId, setPaymentCurrencyId] = useState<string>('');
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'DEFERRED'>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if modal was open previously to detect open transitions
  const prevIsOpenRef = useRef(false);
  // Track previous payment currency to detect actual currency changes
  const prevPaymentCurrencyIdRef = useRef<string>('');

  // Currency allocations - Input State (only updated by user actions)
  const [allocations, setAllocations] = useState<CurrencyAllocation[]>([]);

  // Display strings for allocation inputs (to preserve user typing like "100." without losing decimal)
  const [allocationDisplayMap, setAllocationDisplayMap] = useState<Record<string, string>>({});
  // Display strings for exchange rate inputs
  const [exchangeRateDisplayMap, setExchangeRateDisplayMap] = useState<Record<string, string>>({});

  // Rate calculator popup state (× and ÷ buttons)
  const [rateCalcPopup, setRateCalcPopup] = useState<{ currencyId: string; operation: 'multiply' | 'divide' } | null>(null);
  const [rateCalcInput, setRateCalcInput] = useState('');

  // Get unpaid debts grouped by currency
  const unpaidDebtsByCurrency = useMemo(() => {
    if (!accountSummary) return new Map<string, Debt[]>();

    const allDebts = [...accountSummary.cashDebts, ...accountSummary.deferredDebts];
    const map = new Map<string, Debt[]>();

    for (const debt of allDebts) {
      const remaining = getRemainingForDebt(debt);
      if (remaining > 0) {
        const existing = map.get(debt.currencyId) || [];
        existing.push(debt);
        map.set(debt.currencyId, existing);
      }
    }

    return map;
  }, [accountSummary, getRemainingForDebt]);

  // Get unique currencies with unpaid debts
  const currenciesWithDebt = useMemo(() => {
    const result: Currency[] = [];
    for (const [currencyId] of unpaidDebtsByCurrency) {
      const currency = currencies.find(c => c.id === currencyId);
      if (currency) {
        result.push(currency);
      }
    }
    return result;
  }, [unpaidDebtsByCurrency, currencies]);

  // Calculate remaining debt for a specific currency (in USD equivalent)
  const getCurrencyRemainingDebt = useCallback((currencyId: string): number => {
    const debts = unpaidDebtsByCurrency.get(currencyId) || [];
    return debts.reduce((sum, d) => sum + getRemainingForDebt(d), 0);
  }, [unpaidDebtsByCurrency, getRemainingForDebt]);

  // Initialize allocations ONLY when modal opens (transitions from closed to open)
  // ❌ Never reset form state on data changes - only on modal open
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (justOpened && accountSummary) {
      // Set default payment currency to USD
      const usdCurrency = currencies.find(c => c.isDefault || c.code === 'USD');
      const defaultCurrencyId = usdCurrency?.id || currencies[0]?.id || '';
      setPaymentCurrencyId(defaultCurrencyId);
      // Set the ref so the reactive effect knows the initial currency
      prevPaymentCurrencyIdRef.current = defaultCurrencyId;

      // Initialize allocations for each currency with unpaid debts
      // ❗ Exchange rate is 0 for cross-currency (requires manual entry), 1 for same currency
      const initialAllocations: CurrencyAllocation[] = [];
      for (const currency of currenciesWithDebt) {
        const remaining = getCurrencyRemainingDebt(currency.id);
        const isSameCurrency = currency.id === defaultCurrencyId;
        initialAllocations.push({
          currencyId: currency.id,
          selected: false,
          exchangeRate: isSameCurrency ? 1 : 0, // ❗ 0 = empty, user must enter manually
          allocatedAmount: 0,
          remainingDebt: remaining,
        });
      }
      setAllocations(initialAllocations);

      // Reset form ONLY on modal open
      setPaymentAmountDisplay('');
      setPaymentType('CASH');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentDescription('');
      setAllocationDisplayMap({});
      setExchangeRateDisplayMap({});
    }
  }, [isOpen]);

  // Update remaining debt in allocations when data changes (without resetting user inputs)
  useEffect(() => {
    if (!isOpen || !accountSummary) return;

    setAllocations(prev => {
      // If no allocations exist yet, don't create new ones (handled by open effect)
      if (prev.length === 0) return prev;

      // Update remaining debt and add new currencies, but preserve user inputs
      const updated = [...prev];
      const existingIds = new Set(updated.map(a => a.currencyId));

      // Add any new currencies that have debts
      // ❗ Exchange rate is 0 for cross-currency (requires manual entry)
      for (const currency of currenciesWithDebt) {
        if (!existingIds.has(currency.id)) {
          const remaining = getCurrencyRemainingDebt(currency.id);
          const isSameCurrency = currency.id === paymentCurrencyId;
          updated.push({
            currencyId: currency.id,
            selected: false,
            exchangeRate: isSameCurrency ? 1 : 0,
            allocatedAmount: 0,
            remainingDebt: remaining,
          });
        }
      }

      // Update remaining debt for existing allocations
      return updated.map(a => {
        const newRemaining = getCurrencyRemainingDebt(a.currencyId);
        // Only update remainingDebt, preserve all user inputs (selected, exchangeRate, allocatedAmount)
        if (newRemaining !== a.remainingDebt) {
          return { ...a, remainingDebt: newRemaining };
        }
        return a;
      });
    });
  }, [isOpen, accountSummary, currenciesWithDebt, getCurrencyRemainingDebt]);

  // Get selected payment currency
  const paymentCurrency = useMemo(() => {
    return currencies.find(c => c.id === paymentCurrencyId);
  }, [currencies, paymentCurrencyId]);

  // Reactive: When payment currency changes, reset exchange rates for cross-currency allocations
  // ❗ Exchange rate is NOT auto-calculated - user must enter it manually
  useEffect(() => {
    if (!paymentCurrencyId || allocations.length === 0) return;

    // Detect actual currency change vs re-render
    const currencyChanged = prevPaymentCurrencyIdRef.current !== '' && 
                            prevPaymentCurrencyIdRef.current !== paymentCurrencyId;
    prevPaymentCurrencyIdRef.current = paymentCurrencyId;

    // Only update when currency actually changed
    if (!currencyChanged) return;

    // Clear display map for exchange rates so user must re-enter
    setExchangeRateDisplayMap({});

    setAllocations(prev => prev.map(a => {
      // If same currency, auto-set rate to 1 (no conversion needed)
      if (a.currencyId === paymentCurrencyId) {
        return { ...a, exchangeRate: 1 };
      }
      // For cross-currency: reset to 0 (empty) - user must enter manually
      return { ...a, exchangeRate: 0 };
    }));
  }, [paymentCurrencyId, allocations.length]);

  // Payment amount (parsed from display string - Input State)
  const paymentAmount = parseFormattedNumber(paymentAmountDisplay);

  // Calculate equivalent value for an allocation using the USER-ENTERED exchange rate
  const getEquivalentValue = useCallback((allocation: CurrencyAllocation): number => {
    if (!allocation.allocatedAmount) return 0;

    // If paying in the same currency as the debt, no conversion needed
    if (allocation.currencyId === paymentCurrencyId) {
      return allocation.allocatedAmount;
    }

    // ❗ Use the user-entered exchange rate from allocation
    // exchangeRate means: 1 payment currency = exchangeRate debt currency units
    // So: equivalent in debt currency = allocatedAmount * exchangeRate
    if (!allocation.exchangeRate || allocation.exchangeRate <= 0) return 0;

    return allocation.allocatedAmount * allocation.exchangeRate;
  }, [paymentCurrencyId]);

  // Calculate total distributed amount (in payment currency)
  const totalDistributed = useMemo(() => {
    return allocations
      .filter(a => a.selected)
      .reduce((sum, a) => sum + a.allocatedAmount, 0);
  }, [allocations]);

  // Remaining amount
  const remainingAmount = paymentAmount - totalDistributed;

  // Surplus (if total distributed > payment amount)
  const surplus = Math.max(0, totalDistributed - paymentAmount);

  // Validation
  const hasPaymentAmount = paymentAmount > 0;
  const hasSelectedCurrencies = allocations.some(a => a.selected);
  // ❗ Validate exchange rate for cross-currency allocations specifically
  const allSelectedHaveExchangeRate = allocations
    .filter(a => a.selected && a.currencyId !== paymentCurrencyId)
    .every(a => a.exchangeRate > 0);
  // Also ensure no zero/negative exchange rate
  const noInvalidExchangeRate = allocations
    .filter(a => a.selected && a.currencyId !== paymentCurrencyId)
    .every(a => a.exchangeRate !== null && a.exchangeRate !== undefined && a.exchangeRate > 0);
  const noOverAllocation = allocations
    .filter(a => a.selected)
    .every(a => a.allocatedAmount <= a.remainingDebt || a.currencyId !== paymentCurrencyId);
  const isBalanced = remainingAmount >= 0 && remainingAmount <= 0.01; // small tolerance for floating point

  // For cross-currency: we allow total to be ≤ payment amount
  const isWithinBudget = totalDistributed <= paymentAmount + 0.01;

  const canSubmit = hasPaymentAmount && hasSelectedCurrencies && allSelectedHaveExchangeRate && noInvalidExchangeRate && isWithinBudget && noOverAllocation;

  // Handle allocation change
  const updateAllocation = (currencyId: string, field: keyof CurrencyAllocation, value: unknown) => {
    setAllocations(prev =>
      prev.map(a => {
        if (a.currencyId !== currencyId) return a;
        return { ...a, [field]: value };
      })
    );
  };

  // Handle payment amount input with formatting and validation
  const handlePaymentAmountChange = (value: string) => {
    // Only allow numbers, dots, and commas
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    // Prevent multiple dots
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return; // Don't allow multiple decimal points
    }
    // Directly set display value - never overwrite with calculated value
    setPaymentAmountDisplay(cleanValue);
  };

  // Handle exchange rate input for allocation (with validation)
  const handleExchangeRateChange = (currencyId: string, value: string) => {
    // Only allow numbers, dots, and commas
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    // Prevent multiple dots
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    // Store display value for this field
    setExchangeRateDisplayMap(prev => ({ ...prev, [currencyId]: cleanValue }));
    const numValue = parseFormattedNumber(cleanValue);
    updateAllocation(currencyId, 'exchangeRate', numValue || 0);
  };

  // Apply rate calculator operation (× or ÷)
  const applyRateCalcOperation = () => {
    if (!rateCalcPopup) return;

    const operand = parseFormattedNumber(rateCalcInput);

    // Validation: operand must be a positive number
    if (!operand || operand <= 0 || isNaN(operand)) {
      toast({
        title: 'قيمة غير صالحة',
        description: 'الرجاء إدخال رقم موجب',
        variant: 'destructive',
      });
      return;
    }

    // Validation: prevent division by zero (operand > 0 already checked above)
    if (rateCalcPopup.operation === 'divide' && operand === 0) {
      toast({
        title: 'خطأ',
        description: 'لا يمكن القسمة على صفر',
        variant: 'destructive',
      });
      return;
    }

    const allocation = allocations.find(a => a.currencyId === rateCalcPopup.currencyId);
    if (!allocation || !allocation.exchangeRate || allocation.exchangeRate <= 0) {
      toast({
        title: 'سعر الصرف مطلوب',
        description: 'الرجاء إدخال سعر الصرف أولاً قبل استخدام العمليات الحسابية',
        variant: 'destructive',
      });
      setRateCalcPopup(null);
      setRateCalcInput('');
      return;
    }

    const currentRate = allocation.exchangeRate;
    let newRate: number;

    if (rateCalcPopup.operation === 'multiply') {
      newRate = currentRate * operand;
    } else {
      newRate = currentRate / operand;
    }

    // Round to avoid floating point issues
    newRate = Math.round(newRate * 10000) / 10000;

    // Update the allocation and display map
    updateAllocation(rateCalcPopup.currencyId, 'exchangeRate', newRate);
    setExchangeRateDisplayMap(prev => ({ ...prev, [rateCalcPopup.currencyId]: formatInputNumber(newRate) }));

    // Close popup
    setRateCalcPopup(null);
    setRateCalcInput('');
  };

  // Handle allocated amount input for allocation (with validation)
  const handleAllocatedAmountChange = (currencyId: string, value: string) => {
    // Only allow numbers, dots, and commas
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    // Prevent multiple dots
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    // Store display value for this field
    setAllocationDisplayMap(prev => ({ ...prev, [currencyId]: cleanValue }));
    const numValue = parseFormattedNumber(cleanValue);
    // ❗ Never set allocatedAmount to 0 from user input - allow empty for typing
    updateAllocation(currencyId, 'allocatedAmount', numValue);
  };

  // Toggle currency selection
  const toggleCurrencySelection = (currencyId: string) => {
    setAllocations(prev =>
      prev.map(a => {
        if (a.currencyId !== currencyId) return a;
        return { ...a, selected: !a.selected };
      })
    );
  };

  // Quick fill: set allocated amount to remaining debt for a currency
  // ❗ Uses the user-entered exchange rate for cross-currency conversion
  const quickFillCurrency = (currencyId: string) => {
    const allocation = allocations.find(a => a.currencyId === currencyId);
    if (!allocation) return;

    let fillAmount: number;

    // If same currency as payment, just set to remaining
    if (currencyId === paymentCurrencyId) {
      fillAmount = allocation.remainingDebt;
    } else {
      // If different currency, use the USER-ENTERED exchange rate
      // exchangeRate means: 1 payment currency = exchangeRate debt currency units
      // So: to pay remainingDebt in debt currency, we need: remainingDebt / exchangeRate in payment currency
      if (!allocation.exchangeRate || allocation.exchangeRate <= 0) {
        toast({
          title: 'سعر الصرف مطلوب',
          description: 'الرجاء إدخال سعر الصرف أولاً قبل التعبئة التلقائية',
          variant: 'destructive',
        });
        return;
      }
      fillAmount = allocation.remainingDebt / allocation.exchangeRate;
    }

    // Update both the allocation and the display map
    updateAllocation(currencyId, 'allocatedAmount', fillAmount);
    setAllocationDisplayMap(prev => ({ ...prev, [currencyId]: formatInputNumber(fillAmount) }));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!accountSummary || !canSubmit) return;

    setIsSubmitting(true);
    try {
      const currentBalance = accountSummary.netCashBalance;
      const direction: 'RECEIVABLE' | 'PAYABLE' = currentBalance < 0 ? 'RECEIVABLE' : 'PAYABLE';
      const selectedAllocations = allocations.filter(a => a.selected && a.allocatedAmount > 0);

      let totalApplied = 0;
      const createdPaymentIds: string[] = [];

      // Process each selected currency allocation
      for (const allocation of selectedAllocations) {
        const debtsInCurrency = unpaidDebtsByCurrency.get(allocation.currencyId) || [];
        let remainingAllocation = allocation.allocatedAmount;

        // Find unpaid debts in this currency and pay them
        for (const debt of debtsInCurrency) {
          if (remainingAllocation <= 0) break;

          const debtRemaining = getRemainingForDebt(debt);

          // Calculate how much to pay on this debt
          let payAmount: number;

          if (allocation.currencyId === paymentCurrencyId) {
            // Same currency: pay up to the remaining allocation or debt remaining
            payAmount = Math.min(remainingAllocation, debtRemaining);
          } else {
            // Cross-currency: use the USER-ENTERED exchange rate
            // exchangeRate means: 1 payment currency = exchangeRate debt currency units
            // So: allocatedAmount (payment currency) * exchangeRate = equivalent in debt currency
            if (!allocation.exchangeRate || allocation.exchangeRate <= 0) continue;

            const allocInDebtCurrency = remainingAllocation * allocation.exchangeRate;
            payAmount = Math.min(allocInDebtCurrency, debtRemaining);
          }

          if (payAmount > 0) {
            // Determine the currencyId for the payment
            // For same-currency, use the debt's currency
            // For cross-currency, we still record the payment in the debt's currency
            const paymentCurrencyForDebt = debt.currencyId;

            const payment = await onAddDebtPayment({
              debtId: debt.id,
              amount: payAmount,
              currencyId: paymentCurrencyForDebt,
              description: paymentDescription || `دفعة متعددة العملات - ${paymentCurrency?.code || ''}`,
              date: paymentDate,
              paymentMode: paymentType,
              direction,
              currentBalance,
            });
            createdPaymentIds.push(payment.id);
            totalApplied += payAmount;

            // Reduce remaining allocation
            if (allocation.currencyId === paymentCurrencyId) {
              remainingAllocation -= payAmount;
            } else {
              // Cross-currency: use the USER-ENTERED exchange rate to calculate used amount
              // payAmount is in debt currency, convert back to payment currency
              // payAmount / exchangeRate = amount in payment currency
              if (allocation.exchangeRate && allocation.exchangeRate > 0) {
                remainingAllocation -= payAmount / allocation.exchangeRate;
              }
            }
          }
        }
      }

      // Handle surplus (if total applied in payment currency < total payment amount)
      const actualSurplus = paymentAmount - totalDistributed;
      if (actualSurplus > 0.01 && createdPaymentIds.length > 0) {
        // 🔹 تحديد اتجاه الفائض:
        // - currentBalance < 0 (علينا) → دفعنا أكثر → فائض "لنا"
        // - currentBalance > 0 (لنا) → قبضنا أكثر → فائض "علينا"
        const overflowDirection: 'RECEIVABLE' | 'PAYABLE' = currentBalance < 0 ? 'RECEIVABLE' : 'PAYABLE';

        const overflowTransactionType: 'INCOME' | 'EXPENSE' = overflowDirection === 'RECEIVABLE' ? 'INCOME' : 'EXPENSE';

        const transaction = await onAddTransaction({
          accountId: accountSummary.accountId,
          currencyId: paymentCurrencyId || 'cur_usd',
          type: overflowTransactionType,
          paymentType,
          amount: actualSurplus,
          conversionFactor: 1,
          conversionMethod: 'MULTIPLY',
          feesType: 'FIXED',
          feesDirection: 'INCOME',
          feesAmount: 0,
          description: overflowDirection === 'RECEIVABLE' ? 'فائض دفعة متعددة العملات - لنا' : 'فائض دفعة متعددة العملات - علينا',
          date: new Date().toISOString().split('T')[0],
          isOverflowTransaction: true,
          relatedPaymentId: createdPaymentIds[0],
        });

        if (transaction.success && transaction.data) {
          await onUpdateDebtPayment(createdPaymentIds[0], {
            overflowTransactionId: transaction.data.id,
          });
        }

        toast({
          title: 'تم تسجيل الفائض كحركة',
          description: `تم إضافة حركة "${overflowDirection === 'RECEIVABLE' ? 'لنا' : 'علينا'}" بقيمة ${formatNumber(actualSurplus)} ${paymentCurrency?.symbol || '$'}`,
        });
      }

      // Close and refresh
      onClose();
      await onPaymentComplete();

      toast({
        title: 'تم بنجاح',
        description: `تم تسديد الدفعة بمبلغ ${formatNumber(paymentAmount)} ${paymentCurrency?.symbol || '$'} على ${selectedAllocations.length} عملة${actualSurplus > 0.01 ? ` مع فائض ${formatNumber(actualSurplus)} ${paymentCurrency?.symbol || '$'}` : ''}`,
      });
    } catch (error) {
      console.error('Error processing multi-currency payment:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء معالجة الدفعة',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    setPaymentAmountDisplay('');
    setPaymentDescription('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentType('CASH');
    setAllocations([]);
    setPaymentCurrencyId('');
    setAllocationDisplayMap({});
    setExchangeRateDisplayMap({});
    setRateCalcPopup(null);
    setRateCalcInput('');
    // Reset the refs so next open will trigger initialization
    prevIsOpenRef.current = false;
    prevPaymentCurrencyIdRef.current = '';
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-500" />
            تسديد ديون
          </DialogTitle>
        </DialogHeader>

        {accountSummary && (
          <div className="space-y-4 mt-4">
            {/* Account Name */}
            <div className="rounded-xl p-3 bg-muted/50 flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                accountSummary.netCashBalance >= 0
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {accountSummary.netCashBalance >= 0
                  ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  : <ArrowDownRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <p className="font-bold text-foreground">{accountSummary.account?.name || 'غير معروف'}</p>
                <p className={cn(
                  'text-sm',
                  accountSummary.netCashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  الرصيد: {accountSummary.netCashBalance >= 0 ? '+' : ''}{formatNumber(accountSummary.netCashBalance)} $
                </p>
              </div>
            </div>

            {/* Payment Currency Selector */}
            <div className="space-y-2">
              <Label>عملة الدفع</Label>
              <Select
                value={paymentCurrencyId}
                onValueChange={setPaymentCurrencyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر عملة الدفع" />
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

            {/* Total Payment Amount */}
            <div className="space-y-2">
              <Label>إجمالي مبلغ الدفع</Label>
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
                {paymentCurrency && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {paymentCurrency.symbol}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Type Toggle */}
            <div className="space-y-2">
              <Label>نوع الدفع</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('CASH')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    paymentType === 'CASH'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/30 dark:border-teal-600 dark:text-teal-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Banknote className="w-5 h-5" />
                  <span>نقدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('DEFERRED')}
                  className={cn(
                    'py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5 border-2',
                    paymentType === 'DEFERRED'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/30 dark:border-purple-600 dark:text-purple-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Clock className="w-5 h-5" />
                  <span>آجل</span>
                </button>
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label>البيان</Label>
              <Textarea
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>

            {/* Allocation Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <Label className="text-base font-bold">توزيع الدفعة على العملات</Label>
              </div>

              {currenciesWithDebt.length === 0 ? (
                <div className="text-center py-6 rounded-xl bg-muted/30">
                  <CheckCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد ديون مستحقة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {currenciesWithDebt.map((currency) => {
                      const allocation = allocations.find(a => a.currencyId === currency.id);
                      if (!allocation) return null;

                      const isSameCurrency = currency.id === paymentCurrencyId;
                      const equivalentValue = getEquivalentValue(allocation);
                      const isOverDebt = allocation.allocatedAmount > allocation.remainingDebt && isSameCurrency;

                      return (
                        <motion.div
                          key={currency.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            'rounded-xl border p-3 transition-all',
                            allocation.selected
                              ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                              : 'border-border/50 bg-muted/30'
                          )}
                        >
                          {/* Currency Header with Checkbox */}
                          <div className="flex items-center gap-3 mb-3">
                            <Checkbox
                              checked={allocation.selected}
                              onCheckedChange={() => toggleCurrencySelection(currency.id)}
                              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{currency.name}</span>
                                <span className="text-xs text-muted-foreground">({currency.symbol})</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-muted-foreground">المتبقي:</span>
                                <span className={cn(
                                  'text-xs font-bold',
                                  isOverDebt ? 'text-red-600' : 'text-amber-600'
                                )}>
                                  {formatNumber(allocation.remainingDebt)} {currency.symbol}
                                </span>
                              </div>
                            </div>
                            {allocation.selected && isSameCurrency && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => quickFillCurrency(currency.id)}
                                className="text-xs text-amber-600 hover:text-amber-700 h-7 px-2"
                              >
                                تعبئة
                              </Button>
                            )}
                            {allocation.selected && !isSameCurrency && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => quickFillCurrency(currency.id)}
                                className="text-xs text-amber-600 hover:text-amber-700 h-7 px-2"
                              >
                                تعبئة
                              </Button>
                            )}
                          </div>

                          {/* Allocation Fields (only when selected) */}
                          {allocation.selected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2"
                            >
                              {/* Exchange Rate (only for cross-currency) - ❗ MANUAL ENTRY ONLY */}
                              {!isSameCurrency && (
                                <div className="space-y-1">
                                  <Label className="text-xs">سعر الصرف</Label>
                                  <div className="flex items-center gap-1.5" dir="ltr">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={exchangeRateDisplayMap[currency.id] ?? (allocation.exchangeRate > 0 ? formatInputNumber(allocation.exchangeRate) : '')}
                                      onChange={(e) => handleExchangeRateChange(currency.id, e.target.value)}
                                      className={cn(
                                        "h-8 text-sm text-left font-mono flex-1 min-w-0",
                                        allocation.selected && (!allocation.exchangeRate || allocation.exchangeRate <= 0) && "border-red-500 focus-visible:ring-red-500"
                                      )}
                                      dir="ltr"
                                      placeholder="أدخل السعر"
                                    />
                                    {/* × and ÷ Buttons */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!allocation.exchangeRate || allocation.exchangeRate <= 0) {
                                          toast({ title: 'سعر الصرف مطلوب', description: 'أدخل سعر الصرف أولاً', variant: 'destructive' });
                                          return;
                                        }
                                        setRateCalcPopup({ currencyId: currency.id, operation: 'multiply' });
                                        setRateCalcInput('');
                                      }}
                                      className={cn(
                                        'w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold border-2 transition-all shrink-0 cursor-pointer',
                                        rateCalcPopup?.currencyId === currency.id && rateCalcPopup?.operation === 'multiply'
                                          ? 'bg-teal-500 text-white border-teal-500'
                                          : 'bg-muted text-foreground border-border hover:bg-teal-100 hover:text-teal-700 hover:border-teal-400 dark:hover:bg-teal-950/40 dark:hover:text-teal-400 dark:hover:border-teal-600'
                                      )}
                                      title="ضرب"
                                    >
                                      ×
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!allocation.exchangeRate || allocation.exchangeRate <= 0) {
                                          toast({ title: 'سعر الصرف مطلوب', description: 'أدخل سعر الصرف أولاً', variant: 'destructive' });
                                          return;
                                        }
                                        setRateCalcPopup({ currencyId: currency.id, operation: 'divide' });
                                        setRateCalcInput('');
                                      }}
                                      className={cn(
                                        'w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold border-2 transition-all shrink-0 cursor-pointer',
                                        rateCalcPopup?.currencyId === currency.id && rateCalcPopup?.operation === 'divide'
                                          ? 'bg-teal-500 text-white border-teal-500'
                                          : 'bg-muted text-foreground border-border hover:bg-teal-100 hover:text-teal-700 hover:border-teal-400 dark:hover:bg-teal-950/40 dark:hover:text-teal-400 dark:hover:border-teal-600'
                                      )}
                                      title="قسمة"
                                    >
                                      ÷
                                    </button>
                                  </div>
                                  {/* Rate Calculator Popup */}
                                  {rateCalcPopup?.currencyId === currency.id && (
                                    <div className="flex items-center gap-1.5" dir="ltr">
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {rateCalcPopup.operation === 'multiply' ? 'ضرب في' : 'قسمة على'}
                                      </span>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={rateCalcInput}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9.,]/g, '');
                                          const parts = val.split('.');
                                          if (parts.length <= 2) setRateCalcInput(val);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') applyRateCalcOperation();
                                          if (e.key === 'Escape') { setRateCalcPopup(null); setRateCalcInput(''); }
                                        }}
                                        className="h-7 text-xs text-left font-mono w-20"
                                        dir="ltr"
                                        placeholder="0"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={applyRateCalcOperation}
                                        className="h-7 px-2 rounded-md text-xs font-medium bg-teal-500 text-white hover:bg-teal-600 transition-colors shrink-0 cursor-pointer"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setRateCalcPopup(null); setRateCalcInput(''); }}
                                        className="h-7 px-2 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                  {/* Exchange rate description */}
                                  <span className="text-xs text-muted-foreground">
                                    1 {paymentCurrency?.code} = {allocation.exchangeRate > 0 ? formatNumber(allocation.exchangeRate) : '?'} {currency.code}
                                  </span>
                                  {/* Validation: warn if exchange rate is missing */}
                                  {allocation.selected && (!allocation.exchangeRate || allocation.exchangeRate <= 0) && (
                                    <div className="flex items-center gap-1.5">
                                      <AlertTriangle className="w-3 h-3 text-red-500" />
                                      <span className="text-[10px] text-red-500">يجب إدخال سعر الصرف</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Amount Input */}
                              <div className="flex items-center gap-2">
                                <Label className="text-xs min-w-[70px]">المبلغ</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={allocationDisplayMap[currency.id] ?? (allocation.allocatedAmount ? formatInputNumber(allocation.allocatedAmount) : '')}
                                  onChange={(e) => handleAllocatedAmountChange(currency.id, e.target.value)}
                                  className={cn(
                                    "h-8 text-sm text-left font-mono",
                                    isOverDebt && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  dir="ltr"
                                  placeholder="0"
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {paymentCurrency?.symbol || '$'}
                                </span>
                              </div>

                              {/* Equivalent Value (for cross-currency using USER-ENTERED rate) */}
                              {!isSameCurrency && allocation.allocatedAmount > 0 && allocation.exchangeRate > 0 && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/20">
                                  <Info className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-xs text-amber-700 dark:text-amber-300">
                                    المكافئ: {formatNumber(equivalentValue)} {currency.symbol} ({formatNumber(allocation.allocatedAmount)} {paymentCurrency?.symbol} × {formatNumber(allocation.exchangeRate)})
                                  </span>
                                </div>
                              )}

                              {/* Over debt warning */}
                              {isOverDebt && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                  <span className="text-xs text-red-600 dark:text-red-400">
                                    المبلغ يتجاوز الدين المتبقي ({formatNumber(allocation.remainingDebt)} {currency.symbol})
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Summary Section */}
            {hasPaymentAmount && currenciesWithDebt.length > 0 && (
              <div className="rounded-xl p-4 bg-muted/50 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">ملخص التوزيع</span>
                </div>

                {/* Total Distributed */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">إجمالي المبلغ الموزع</span>
                  <span className="font-bold text-foreground">
                    {formatNumber(totalDistributed)} {paymentCurrency?.symbol || '$'}
                  </span>
                </div>

                {/* Remaining */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">المبلغ المتبقي</span>
                  <span className={cn(
                    'font-bold',
                    remainingAmount > 0.01 ? 'text-amber-600' : 'text-emerald-600'
                  )}>
                    {formatNumber(Math.max(0, remainingAmount))} {paymentCurrency?.symbol || '$'}
                  </span>
                </div>

                {/* Surplus */}
                {surplus > 0.01 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الفائض</span>
                    <span className="font-bold text-red-600">
                      {formatNumber(surplus)} {paymentCurrency?.symbol || '$'}
                    </span>
                  </div>
                )}

                {/* Status Indicator */}
                <div className={cn(
                  'pt-2 border-t flex items-center gap-2',
                  isBalanced ? 'border-emerald-200 dark:border-emerald-800'
                    : remainingAmount > 0.01 ? 'border-amber-200 dark:border-amber-800'
                    : 'border-red-200 dark:border-red-800'
                )}>
                  {isBalanced ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600">المبلغ متوازن</span>
                    </>
                  ) : remainingAmount > 0.01 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">مبلغ غير موزع: {formatNumber(remainingAmount)} {paymentCurrency?.symbol || '$'}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">توزيع زائد عن مبلغ الدفع</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="w-full h-12 text-base bg-teal-500 hover:bg-teal-600"
            >
              {isSubmitting ? 'جاري المعالجة...' : (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  تسديد الدفعة
                </span>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
