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

// Convert amount using conversion method
function convertAmount(amount: number, rate: number, method: string): number {
  if (!rate || rate === 0) return 0;
  if (method === 'MULTIPLY') {
    return amount * rate;
  } else {
    return amount / rate;
  }
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
      const initialAllocations: CurrencyAllocation[] = [];
      for (const currency of currenciesWithDebt) {
        const remaining = getCurrencyRemainingDebt(currency.id);
        initialAllocations.push({
          currencyId: currency.id,
          selected: false,
          exchangeRate: currency.exchangeRate || 1,
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
      for (const currency of currenciesWithDebt) {
        if (!existingIds.has(currency.id)) {
          const remaining = getCurrencyRemainingDebt(currency.id);
          updated.push({
            currencyId: currency.id,
            selected: false,
            exchangeRate: currency.exchangeRate || 1,
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

  // Reactive: When payment currency changes, update exchange rates for cross-currency allocations
  // ❗ Only updates when paymentCurrencyId ACTUALLY changes (not when user edits exchange rate)
  useEffect(() => {
    if (!paymentCurrencyId || allocations.length === 0) return;

    // Detect actual currency change vs re-render
    const currencyChanged = prevPaymentCurrencyIdRef.current !== '' && 
                            prevPaymentCurrencyIdRef.current !== paymentCurrencyId;
    prevPaymentCurrencyIdRef.current = paymentCurrencyId;

    // Only update exchange rates when currency actually changed
    if (!currencyChanged) return;

    // Build new display map for exchange rates
    const newRateDisplayMap: Record<string, string> = {};

    setAllocations(prev => prev.map(a => {
      // If same currency, no exchange rate needed
      if (a.currencyId === paymentCurrencyId) {
        return { ...a, exchangeRate: 1 };
      }

      // For cross-currency: calculate the exchange rate between payment currency and debt currency
      const debtCurrency = currencies.find(c => c.id === a.currencyId);
      if (!debtCurrency || !paymentCurrency) return a;

      // Calculate cross rate: how many debt currency units per 1 payment currency unit
      // Step 1: Convert 1 payment currency to USD
      let onePaymentInUsd = 1;
      if (paymentCurrency.conversionMethod === 'DIVIDE') {
        onePaymentInUsd = 1 / paymentCurrency.exchangeRate;
      } else {
        onePaymentInUsd = paymentCurrency.exchangeRate;
      }

      // Step 2: Convert USD to debt currency
      let crossRate = onePaymentInUsd;
      if (debtCurrency.conversionMethod === 'DIVIDE') {
        crossRate = onePaymentInUsd / debtCurrency.exchangeRate;
      } else {
        crossRate = onePaymentInUsd * debtCurrency.exchangeRate;
      }

      // Update display map for this rate
      newRateDisplayMap[a.currencyId] = formatInputNumber(crossRate);

      return { ...a, exchangeRate: crossRate };
    }));

    // Update the display map with new rates
    setExchangeRateDisplayMap(prev => ({ ...prev, ...newRateDisplayMap }));
  }, [paymentCurrencyId, paymentCurrency, currencies, allocations.length]);

  // Payment amount (parsed from display string - Input State)
  const paymentAmount = parseFormattedNumber(paymentAmountDisplay);

  // Calculate equivalent value for an allocation
  const getEquivalentValue = useCallback((allocation: CurrencyAllocation): number => {
    if (!paymentCurrency || !allocation.allocatedAmount) return 0;

    // If paying in the same currency as the debt, no conversion needed
    if (allocation.currencyId === paymentCurrencyId) {
      return allocation.allocatedAmount;
    }

    // Convert allocated amount from payment currency to USD equivalent
    // First convert payment amount to USD
    let amountInUsd = allocation.allocatedAmount;
    if (paymentCurrency.conversionMethod === 'DIVIDE') {
      amountInUsd = allocation.allocatedAmount / paymentCurrency.exchangeRate;
    } else {
      amountInUsd = allocation.allocatedAmount * paymentCurrency.exchangeRate;
    }

    return amountInUsd;
  }, [paymentCurrency, paymentCurrencyId]);

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
  const allSelectedHaveExchangeRate = allocations
    .filter(a => a.selected)
    .every(a => a.exchangeRate > 0);
  const noOverAllocation = allocations
    .filter(a => a.selected)
    .every(a => a.allocatedAmount <= a.remainingDebt || a.currencyId !== paymentCurrencyId);
  const isBalanced = remainingAmount >= 0 && remainingAmount <= 0.01; // small tolerance for floating point

  // For cross-currency: we allow total to be ≤ payment amount
  const isWithinBudget = totalDistributed <= paymentAmount + 0.01;

  const canSubmit = hasPaymentAmount && hasSelectedCurrencies && allSelectedHaveExchangeRate && isWithinBudget && noOverAllocation;

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
  const quickFillCurrency = (currencyId: string) => {
    const allocation = allocations.find(a => a.currencyId === currencyId);
    if (!allocation) return;

    let fillAmount: number;

    // If same currency as payment, just set to remaining
    if (currencyId === paymentCurrencyId) {
      fillAmount = allocation.remainingDebt;
    } else {
      // If different currency, convert remaining debt from debt currency to payment currency
      const debtCurrency = currencies.find(c => c.id === currencyId);
      if (!debtCurrency) return;

      // Remaining debt is already in debt currency's finalBalance units
      // We need to convert to payment currency
      // Step 1: Convert remaining debt to USD
      let debtInUsd = allocation.remainingDebt;
      if (debtCurrency.conversionMethod === 'DIVIDE') {
        debtInUsd = allocation.remainingDebt / debtCurrency.exchangeRate;
      } else {
        debtInUsd = allocation.remainingDebt * debtCurrency.exchangeRate;
      }

      // Step 2: Convert USD to payment currency
      let amountInPaymentCurrency = debtInUsd;
      if (paymentCurrency) {
        if (paymentCurrency.conversionMethod === 'DIVIDE') {
          amountInPaymentCurrency = debtInUsd / paymentCurrency.exchangeRate;
        } else {
          amountInPaymentCurrency = debtInUsd * paymentCurrency.exchangeRate;
        }
      }

      fillAmount = amountInPaymentCurrency;
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
            // Cross-currency: convert allocation from payment currency to debt currency
            const debtCurrency = currencies.find(c => c.id === allocation.currencyId);
            if (!debtCurrency) continue;

            // Convert remaining allocation (in payment currency) to USD
            let allocInUsd = remainingAllocation;
            if (paymentCurrency) {
              if (paymentCurrency.conversionMethod === 'DIVIDE') {
                allocInUsd = remainingAllocation / paymentCurrency.exchangeRate;
              } else {
                allocInUsd = remainingAllocation * paymentCurrency.exchangeRate;
              }
            }

            // Convert USD to debt currency
            let allocInDebtCurrency = allocInUsd;
            if (debtCurrency.conversionMethod === 'DIVIDE') {
              allocInDebtCurrency = allocInUsd / debtCurrency.exchangeRate;
            } else {
              allocInDebtCurrency = allocInUsd * debtCurrency.exchangeRate;
            }

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
              // Recalculate how much of the allocation was used
              const debtCurrency = currencies.find(c => c.id === allocation.currencyId);
              if (debtCurrency) {
                let payInUsd = payAmount;
                if (debtCurrency.conversionMethod === 'DIVIDE') {
                  payInUsd = payAmount / debtCurrency.exchangeRate;
                } else {
                  payInUsd = payAmount * debtCurrency.exchangeRate;
                }
                let payInPaymentCurrency = payInUsd;
                if (paymentCurrency) {
                  if (paymentCurrency.conversionMethod === 'DIVIDE') {
                    payInPaymentCurrency = payInUsd / paymentCurrency.exchangeRate;
                  } else {
                    payInPaymentCurrency = payInUsd * paymentCurrency.exchangeRate;
                  }
                }
                remainingAllocation -= payInPaymentCurrency;
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
                                {!isSameCurrency && currency.id !== 'cur_usd' && (
                                  <span className="text-[10px] text-muted-foreground">
                                    (≈ {formatNumber(convertAmount(allocation.remainingDebt, currency.exchangeRate, currency.conversionMethod))} $)
                                  </span>
                                )}
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
                              {/* Exchange Rate (only for cross-currency) */}
                              {!isSameCurrency && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs min-w-[70px]">سعر الصرف</Label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={exchangeRateDisplayMap[currency.id] ?? formatInputNumber(allocation.exchangeRate)}
                                    onChange={(e) => handleExchangeRateChange(currency.id, e.target.value)}
                                    className="h-8 text-sm text-left font-mono"
                                    dir="ltr"
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    1 {paymentCurrency?.code} = ? {currency.code}
                                  </span>
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

                              {/* Equivalent Value (for cross-currency) */}
                              {!isSameCurrency && allocation.allocatedAmount > 0 && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/20">
                                  <Info className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-xs text-amber-700 dark:text-amber-300">
                                    المكافئ: {formatNumber(equivalentValue)} $ ≈ {isSameCurrency ? '' : formatNumber(allocation.allocatedAmount)} {paymentCurrency?.symbol}
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
