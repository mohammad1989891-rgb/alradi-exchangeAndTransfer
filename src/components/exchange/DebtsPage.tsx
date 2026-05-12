'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, AlertCircle, CreditCard, Trash2, ArrowUpRight, ArrowDownRight, Banknote, Clock, ChevronLeft, AlertTriangle, CheckCircle, List, X } from 'lucide-react';
import { DebtModal } from './DebtModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatNumber, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Debt, DebtPayment } from '@/lib/localDb';
import { getAccountDebtSummary, type AccountDebtSummary } from '@/lib/localDb';

// واجهة للحركة الموحدة (دين أو دفعة)
interface UnifiedMovement {
  id: string;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
  date: Date;
  direction: 'RECEIVABLE' | 'PAYABLE'; // لنا أو علينا
  mode: 'CASH' | 'DEFERRED';
  description?: string;
  remaining?: number;
  originalData: Debt | DebtPayment;
  overflowTransactionId?: string | null;
}

// واجهة للحساب مع الإجمالي التراكمي
interface CumulativeAccountSummary extends AccountDebtSummary {
  // الديون النقدية فقط
  cashDebts: Debt[];
  deferredDebts: Debt[];
  // الإجمالي التراكمي للديون النقدية
  cumulativeCashReceivable: number;    // إجمالي الديون النقدية لنا
  cumulativeCashPayable: number;       // إجمالي الديون النقدية علينا
  cumulativeCashPaid: number;          // إجمالي المدفوع من الديون النقدية
  cumulativeCashRemaining: number;     // المتبقي التراكمي = لنا - علينا - مدفوع
  // صافي الديون النقدية
  netCashBalance: number;              // صافي النقدية = (لنا - علينا) - مدفوع
  // معلومات إضافية لمعالجة الدفعات الزائدة
  primaryDebtMode: 'CASH' | 'DEFERRED';  // نوع الدين الأساسي
}

export function DebtsPage() {
  const { accounts, openDebtModal, currencies } = useAppStore();
  const { debtRemaining, debtPayments, addDebtPayment, deleteDebtPayment, deleteDebt, refreshData, addTransaction } = useLocalData();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAccountSummary, setSelectedAccountSummary] = useState<CumulativeAccountSummary | null>(null);
  const [accountSummaries, setAccountSummaries] = useState<CumulativeAccountSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'CASH' | 'DEFERRED'>('CASH');  // نوع التسديد
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حالة معالجة الدفعات الزائدة
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false);
  const [overpaymentAmount, setOverpaymentAmount] = useState(0);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
  
  // حالة إظهار/إخفاء تفاصيل الديون
  const [showDebtsDetails, setShowDebtsDetails] = useState(false);
  
  // حالة نافذة جميع الحركات
  const [showAllMovementsModal, setShowAllMovementsModal] = useState(false);
  
  // حالة تأكيد الحذف
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'DEBT' | 'PAYMENT';
    data: Debt | DebtPayment;
    overflowAmount?: number;
  } | null>(null);

  // حساب المدفوع لكل دين
  const getPaymentsForDebt = (debtId: string): DebtPayment[] => {
    return debtPayments.filter(p => p.debtId === debtId);
  };

  // حساب إجمالي المدفوع لدين معين
  const getPaidAmountForDebt = (debtId: string): number => {
    return getPaymentsForDebt(debtId).reduce((sum, p) => sum + p.amount, 0);
  };

  // حساب المتبقي لدين معين
  const getRemainingForDebt = (debt: Debt): number => {
    const paid = getPaidAmountForDebt(debt.id);
    return Math.max(0, debt.finalBalance - paid);
  };

  // ============================================
  // 🔹 إنشاء قائمة الحركات الموحدة مع فلتر التاريخ
  // ============================================
  const getUnifiedMovements = useCallback((summary: CumulativeAccountSummary | null, filterFromDate?: string, filterToDate?: string): UnifiedMovement[] => {
    if (!summary) return [];
    
    const movements: UnifiedMovement[] = [];
    
    // إضافة جميع الديون (نقدية وآجلة)
    const allDebts = [...summary.cashDebts, ...summary.deferredDebts];
    allDebts.forEach(debt => {
      // فلتر التاريخ على الديون
      if (filterFromDate || filterToDate) {
        const debtDate = new Date(debt.date);
        debtDate.setHours(0, 0, 0, 0);
        if (filterFromDate) {
          const from = new Date(filterFromDate);
          from.setHours(0, 0, 0, 0);
          if (debtDate < from) return; // تخطي إذا قبل تاريخ البداية
        }
        if (filterToDate) {
          const to = new Date(filterToDate);
          to.setHours(23, 59, 59, 999);
          if (debtDate > to) return; // تخطي إذا بعد تاريخ النهاية
        }
      }

      movements.push({
        id: debt.id,
        type: 'DEBT',
        amount: debt.finalBalance,
        date: new Date(debt.date),
        direction: debt.debtType || 'RECEIVABLE',
        mode: debt.debtMode || 'DEFERRED',
        description: debt.description,
        remaining: getRemainingForDebt(debt),
        originalData: debt,
      });
    });
    
    // إضافة جميع الدفعات
    const accountDebtIds = allDebts.map(d => d.id);
    const accountPayments = debtPayments.filter(p => accountDebtIds.includes(p.debtId));
    
    accountPayments.forEach(payment => {
      // فلتر التاريخ على الدفعات
      if (filterFromDate || filterToDate) {
        const payDate = new Date(payment.date);
        payDate.setHours(0, 0, 0, 0);
        if (filterFromDate) {
          const from = new Date(filterFromDate);
          from.setHours(0, 0, 0, 0);
          if (payDate < from) return;
        }
        if (filterToDate) {
          const to = new Date(filterToDate);
          to.setHours(23, 59, 59, 999);
          if (payDate > to) return;
        }
      }

      const debt = allDebts.find(d => d.id === payment.debtId);
      movements.push({
        id: payment.id,
        type: 'PAYMENT',
        amount: payment.amount,
        date: new Date(payment.date),
        direction: payment.paymentDirection || debt?.debtType || 'RECEIVABLE',
        mode: payment.paymentMode || 'CASH',
        description: payment.description,
        originalData: payment,
        overflowTransactionId: payment.overflowTransactionId,
      });
    });
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debtPayments]);

  // حساب الملخص التراكمي للحساب
  const calculateCumulativeSummary = (summary: AccountDebtSummary): CumulativeAccountSummary => {
    // فصل الديون النقدية عن الآجلة
    const cashDebts = summary.debts.filter(d => d.debtMode === 'CASH');
    const deferredDebts = summary.debts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);

    // ============================================
    // 🔹 حساب الديون النقدية
    // ============================================
    let cashReceivable = 0;   // ديون نقدية لنا
    let cashPayable = 0;      // ديون نقدية علينا
    let cashPaid = 0;         // مدفوع من الديون النقدية

    for (const debt of cashDebts) {
      const paid = getPaidAmountForDebt(debt.id);
      cashPaid += paid;

      if (debt.debtType === 'RECEIVABLE' || !debt.debtType) {
        cashReceivable += debt.finalBalance;
      } else {
        cashPayable += debt.finalBalance;
      }
    }

    // ============================================
    // 🔹 حساب الديون الآجلة
    // ============================================
    let deferredReceivable = 0;   // ديون آجلة لنا
    let deferredPayable = 0;      // ديون آجلة علينا
    let deferredPaid = 0;         // مدفوع من الديون الآجلة

    for (const debt of deferredDebts) {
      const paid = getPaidAmountForDebt(debt.id);
      deferredPaid += paid;

      if (debt.debtType === 'RECEIVABLE' || !debt.debtType) {
        deferredReceivable += debt.finalBalance;
      } else {
        deferredPayable += debt.finalBalance;
      }
    }

    // ============================================
    // 🔹 حساب الرصيد التراكمي الكلي
    // 🔸 المعادلة الصحيحة:
    // 🔸 finalBalance = RT - PT + RP - PP
    // 🔸 RT = receivableTransactions (ديون لنا)
    // 🔸 PT = payableTransactions (ديون علينا)
    // 🔸 RP = receivablePayments (دفعات لنا)
    // 🔸 PP = payablePayments (دفعات علينا)
    // ============================================
    
    // إجمالي الحركات (الديون) لنا (نقد + آجل)
    const receivableTransactions = cashReceivable + deferredReceivable;
    
    // إجمالي الحركات (الديون) علينا (نقد + آجل)
    const payableTransactions = cashPayable + deferredPayable;
    
    // ============================================
    // 🔹 حساب الدفعات حسب الاتجاه
    // 🔸 paymentDirection === 'RECEIVABLE' = دفعة لنا (الطرف يدفع لنا)
    // 🔸 paymentDirection === 'PAYABLE' = دفعة علينا (نحن ندفع للطرف)
    // ============================================
    let receivablePayments = 0;  // دفعات لنا
    let payablePayments = 0;     // دفعات علينا
    
    const allDebts = [...cashDebts, ...deferredDebts];
    for (const debt of allDebts) {
      const payments = getPaymentsForDebt(debt.id);
      for (const payment of payments) {
        // استخدام paymentDirection إذا كان موجوداً، وإلا نستخدم debtType
        const direction = payment.paymentDirection || debt.debtType || 'RECEIVABLE';
        if (direction === 'RECEIVABLE') {
          receivablePayments += payment.amount;
        } else {
          payablePayments += payment.amount;
        }
      }
    }
    
    // إجمالي المدفوعات (للعرض فقط)
    const totalPaid = cashPaid + deferredPaid;
    
    // ============================================
    // 🔹 المعادلة الصحيحة للرصيد النهائي
    // 🔸 finalBalance = RT - PT + RP - PP
    // 🔸 موجب = لنا
    // 🔸 سالب = علينا
    // ============================================
    const netCashBalance = 
      receivableTransactions    // ديون لنا (موجب)
      - payableTransactions     // ديون علينا (سالب)
      + receivablePayments      // دفعات لنا (موجب)
      - payablePayments;        // دفعات علينا (سالب)

    // تحديد نوع الدين الأساسي
    let primaryDebtMode: 'CASH' | 'DEFERRED' = 'CASH';
    if (cashDebts.length > 0) {
      primaryDebtMode = cashDebts[0].debtMode || 'CASH';
    } else if (deferredDebts.length > 0) {
      primaryDebtMode = deferredDebts[0].debtMode || 'DEFERRED';
    }

    return {
      ...summary,
      cashDebts,
      deferredDebts,
      // الديون النقدية
      cumulativeCashReceivable: cashReceivable,
      cumulativeCashPayable: cashPayable,
      cumulativeCashPaid: cashPaid,
      cumulativeCashRemaining: Math.abs(netCashBalance),
      // الرصيد التراكمي الكلي
      netCashBalance,
      primaryDebtMode,
    };
  };

  // Load account summaries
  useEffect(() => {
    const loadAccountSummaries = async () => {
      setIsLoadingSummaries(true);
      try {
        const summaries: CumulativeAccountSummary[] = [];
        for (const account of accounts) {
          const summary = await getAccountDebtSummary(account.id);
          if (summary.debts.length > 0) {
            summaries.push(calculateCumulativeSummary(summary));
          }
        }
        setAccountSummaries(summaries);
      } catch (error) {
        console.error('Error loading account summaries:', error);
      } finally {
        setIsLoadingSummaries(false);
      }
    };

    if (accounts.length > 0) {
      loadAccountSummaries();
    }
  }, [accounts, debtRemaining, debtPayments]);

  // هل يوجد فلتر تاريخ مفعل
  const hasDateFilter = fromDate || toDate;

  // تنظيف فلتر التاريخ
  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  // Filter account summaries by search and date
  const filteredSummaries = useMemo(() => {
    return accountSummaries.filter(summary => {
      // فلتر البحث
      if (searchQuery && !summary.account?.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // فلتر التاريخ - إظهار الحسابات التي لديها ديون أو دفعات ضمن الفترة
      if (hasDateFilter) {
        const allDebts = [...summary.cashDebts, ...summary.deferredDebts];
        const hasDebtInRange = allDebts.some(debt => {
          const debtDate = new Date(debt.date);
          debtDate.setHours(0, 0, 0, 0);
          let matchesFrom = true;
          let matchesTo = true;
          if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            matchesFrom = debtDate >= from;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            matchesTo = debtDate <= to;
          }
          return matchesFrom && matchesTo;
        });

        // التحقق من الدفعات أيضاً
        const accountDebtIds = allDebts.map(d => d.id);
        const accountPayments = debtPayments.filter(p => accountDebtIds.includes(p.debtId));
        const hasPaymentInRange = accountPayments.some(payment => {
          const payDate = new Date(payment.date);
          payDate.setHours(0, 0, 0, 0);
          let matchesFrom = true;
          let matchesTo = true;
          if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            matchesFrom = payDate >= from;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            matchesTo = payDate <= to;
          }
          return matchesFrom && matchesTo;
        });

        if (!hasDebtInRange && !hasPaymentInRange) return false;
      }

      return true;
    });
  }, [accountSummaries, searchQuery, hasDateFilter, fromDate, toDate, debtPayments]);

  // إضافة دفعة جديدة للإجمالي التراكمي
  const handleAddCumulativePayment = async () => {
    if (!selectedAccountSummary || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    const paymentAmountInput = parseFloat(paymentAmount);
    const currentBalance = selectedAccountSummary.netCashBalance;

    let newBalance: number;
    if (currentBalance > 0) {
      newBalance = currentBalance - paymentAmountInput;
    } else {
      newBalance = currentBalance + paymentAmountInput;
    }

    const crossedZero = (currentBalance > 0 && newBalance < 0) || (currentBalance < 0 && newBalance > 0);

    if (crossedZero) {
      const excess = Math.abs(newBalance);
      setOverpaymentAmount(excess);
      setPendingPaymentAmount(paymentAmountInput);
      setShowOverpaymentDialog(true);
      return;
    }

    await executePayment(paymentAmountInput);
  };

  // تنفيذ الدفعة
  const executePayment = async (amount: number, isOverpayment: boolean = false) => {
    if (!selectedAccountSummary) return;

    setIsSubmitting(true);
    try {
      const currentBalance = selectedAccountSummary.netCashBalance;

      let newBalance: number;
      if (currentBalance > 0) {
        newBalance = currentBalance - amount;
      } else {
        newBalance = currentBalance + amount;
      }

      let appliedAmount = amount;
      let excessAmount = 0;

      const crossedZero = (currentBalance > 0 && newBalance < 0) || (currentBalance < 0 && newBalance > 0);

      if (crossedZero) {
        appliedAmount = Math.abs(currentBalance);
        excessAmount = Math.abs(newBalance);
      }

      const direction = currentBalance < 0 ? 'RECEIVABLE' : 'PAYABLE';

      let addedPaymentId: string | null = null;
      
      if (appliedAmount > 0) {
        // ============================================
        // 🔹 البحث عن دين غير مدفوع (نقدي أو آجل)
        // 🔸 الدفعات تُسجل على جميع الديون
        // 🔸 تأثير الصندوق يُحدد لاحقاً حسب paymentMode
        // ============================================
        const allDebts = [...selectedAccountSummary.cashDebts, ...selectedAccountSummary.deferredDebts];
        const unpaidDebt = allDebts.find(d => {
          const remaining = getRemainingForDebt(d);
          return remaining > 0;
        });

        if (unpaidDebt) {
          const payment = await addDebtPayment({
            debtId: unpaidDebt.id,
            amount: appliedAmount,
            currencyId: unpaidDebt.currencyId,
            description: paymentDescription || (excessAmount > 0 ? 'دفعة مع فائض' : undefined),
            date: paymentDate,
            paymentMode: paymentType,
            direction,
            currentBalance,  // تمرير الرصيد التراكمي لتحديد تأثير الصندوق بشكل صحيح
          });
          addedPaymentId = payment.id;
        }
      }

      // ============================================
      // 🔹 معالجة الفائض كحركة مستقلة
      // 🔸 الفائض "لنا" = دفعنا زيادة = خرج من الصندوق = خصم (INCOME)
      // 🔸 الفائض "علينا" = قبضنا زيادة = دخل للصندوق = إضافة (EXPENSE)
      // 🔸 إذا كانت الدفعة كاش → الفائض يؤثر على الصندوق
      // 🔸 إذا كانت الدفعة آجل → الفائض لا يؤثر على الصندوق
      // ============================================
      if (excessAmount > 0 && addedPaymentId) {
        // 🔹 تحديد اتجاه الفائض:
        // - currentBalance < 0 (علينا) → دفعنا أكثر → فائض "لنا"
        // - currentBalance > 0 (لنا) → قبضنا أكثر → فائض "علينا"
        const overflowDirection = currentBalance < 0 ? 'RECEIVABLE' : 'PAYABLE';
        
        // 🔹 تحديد نوع الحركة:
        // - RECEIVABLE (لنا) → خصم من الصندوق → INCOME
        // - PAYABLE (علينا) → إضافة للصندوق → EXPENSE
        // في addTransaction:
        // - INCOME: vault.balance - amount (خصم)
        // - EXPENSE: vault.balance + amount (إضافة)
        const overflowTransactionType: 'INCOME' | 'EXPENSE' = overflowDirection === 'RECEIVABLE' ? 'INCOME' : 'EXPENSE';

        // 🔹 تأثير الفائض على الصندوق حسب نوع الدفعة
        const overflowPaymentType: 'CASH' | 'DEFERRED' = paymentType;

        const transaction = await addTransaction({
          accountId: selectedAccountSummary.accountId,
          currencyId: 'cur_usd',
          type: overflowTransactionType,
          paymentType: overflowPaymentType,
          amount: excessAmount,
          conversionFactor: 1,
          conversionMethod: 'MULTIPLY',
          feesType: 'FIXED',
          feesDirection: 'INCOME',
          feesAmount: 0,
          description: overflowDirection === 'RECEIVABLE' ? 'فائض دفعة - لنا' : 'فائض دفعة - علينا',
          date: new Date().toISOString().split('T')[0],
          isOverflowTransaction: true,
          relatedPaymentId: addedPaymentId,
        });

        if (transaction.success && transaction.data) {
          const { updateDebtPayment } = await import('@/lib/localDb');
          await updateDebtPayment(addedPaymentId, {
            overflowTransactionId: transaction.data.id,
          });
        }

        toast({
          title: 'تم تسجيل الفائض كحركة',
          description: `تم إضافة حركة "${overflowDirection === 'RECEIVABLE' ? 'لنا' : 'علينا'}" بقيمة ${formatNumber(excessAmount)} $`,
        });
      }

      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setShowPaymentModal(false);
      setShowOverpaymentDialog(false);
      setOverpaymentAmount(0);
      setPendingPaymentAmount(0);

      const updatedSummary = await getAccountDebtSummary(selectedAccountSummary.accountId);
      setSelectedAccountSummary(calculateCumulativeSummary(updatedSummary));

      toast({
        title: 'تم بنجاح',
        description: `تم إضافة دفعة بقيمة ${formatNumber(appliedAmount)} $${excessAmount > 0 ? ` وفائض ${formatNumber(excessAmount)} $` : ''}`,
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة الدفعة',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // 🔹 حذف دفعة مع تأكيد
  // ============================================
  const handleDeletePaymentClick = (payment: DebtPayment) => {
    setDeleteConfirm({
      type: 'PAYMENT',
      data: payment,
      overflowAmount: payment.overflowTransactionId ? payment.amount : undefined,
    });
  };

  // ============================================
  // 🔹 حذف دين مع تأكيد
  // ============================================
  const handleDeleteDebtClick = (debt: Debt) => {
    const paid = getPaidAmountForDebt(debt.id);
    setDeleteConfirm({
      type: 'DEBT',
      data: debt,
      overflowAmount: paid > 0 ? paid : undefined,
    });
  };

  // تنفيذ الحذف بعد التأكيد
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      if (deleteConfirm.type === 'DEBT') {
        await deleteDebt(deleteConfirm.data.id);
        toast({
          title: 'تم الحذف',
          description: 'تم حذف الدين بنجاح',
        });
      } else {
        await deleteDebtPayment(deleteConfirm.data.id);
        toast({
          title: 'تم الحذف',
          description: 'تم حذف الدفعة بنجاح',
        });
      }
      
      // تحديث البيانات
      if (selectedAccountSummary) {
        const updatedSummary = await getAccountDebtSummary(selectedAccountSummary.accountId);
        if (updatedSummary.debts.length === 0) {
          setSelectedAccountSummary(null);
          setShowAllMovementsModal(false);
        } else {
          setSelectedAccountSummary(calculateCumulativeSummary(updatedSummary));
        }
      }
      await refreshData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الحذف',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الديون</h1>
          <p className="text-sm text-muted-foreground">
            {debtRemaining.unpaidDebtsCount} دين مستحق
          </p>
        </div>
        <Button
          onClick={() => openDebtModal()}
          className="gap-2 rounded-full bg-amber-500 hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" />
          إضافة
        </Button>
      </div>

      {/* Search & Date Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن حساب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* فلتر التاريخ */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Account Cards List */}
      {isLoadingSummaries ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-muted/30">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            {searchQuery || hasDateFilter ? 'لا توجد نتائج' : 'لا توجد ديون'}
          </p>
          {!searchQuery && !hasDateFilter && (
            <Button onClick={() => openDebtModal()} className="bg-amber-500 hover:bg-amber-600">
              إضافة دين جديد
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredSummaries.map((summary, index) => {
              const isPositiveBalance = summary.netCashBalance > 0;
              const isNegativeBalance = summary.netCashBalance < 0;
              const isZeroBalance = summary.netCashBalance === 0;
              
              return (
                <motion.div
                  key={summary.accountId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  onClick={() => setSelectedAccountSummary(summary)}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200',
                    'hover:shadow-lg active:scale-[0.98]',
                    isZeroBalance
                      ? 'bg-gray-50/50 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/30'
                      : isPositiveBalance
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30'
                        : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
                  )}
                >
                  <div className={cn(
                    'absolute right-0 top-0 bottom-0 w-1.5',
                    isZeroBalance 
                      ? 'bg-gray-400' 
                      : isPositiveBalance 
                        ? 'bg-emerald-500' 
                        : 'bg-red-500'
                  )} />

                  <div className="p-4 pr-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          isZeroBalance 
                            ? 'bg-gray-100 dark:bg-gray-900/30' 
                            : isPositiveBalance 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                        )}>
                          {isZeroBalance 
                            ? <CheckCircle className="w-5 h-5 text-gray-600" />
                            : isPositiveBalance 
                              ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                              : <ArrowDownRight className="w-5 h-5 text-red-600" />
                          }
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-lg">
                            {summary.account?.name || 'غير معروف'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {summary.cashDebts.length} دين نقدي • {summary.deferredDebts.length} دين آجل
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground mb-0.5">الرصيد التراكمي</p>
                        <p className={cn(
                          'text-2xl font-bold',
                          isZeroBalance 
                            ? 'text-gray-600 dark:text-gray-400' 
                            : isPositiveBalance 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-red-600 dark:text-red-400'
                        )}>
                          {isZeroBalance ? '0' : `${isPositiveBalance ? '+' : ''}${formatNumber(summary.netCashBalance)}`} $
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-100/50 dark:bg-emerald-900/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs text-emerald-700 dark:text-emerald-400">لنا نقدي</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(summary.cumulativeCashReceivable)} $
                        </p>
                      </div>
                      
                      <div className="bg-red-100/50 dark:bg-red-900/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Banknote className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-xs text-red-700 dark:text-red-400">علينا نقدي</span>
                        </div>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {formatNumber(summary.cumulativeCashPayable)} $
                        </p>
                      </div>
                      
                      <div className="bg-teal-100/50 dark:bg-teal-900/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-xs text-teal-700 dark:text-teal-400">مدفوع</span>
                        </div>
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                          {formatNumber(summary.cumulativeCashPaid)} $
                        </p>
                      </div>
                      
                      <div className="bg-purple-100/50 dark:bg-purple-900/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs text-purple-700 dark:text-purple-400">آجل</span>
                        </div>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {summary.deferredDebts.length} دين
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Debt Modal */}
      <DebtModal />

      {/* Account Detail Modal */}
      <Dialog open={!!selectedAccountSummary && !showAllMovementsModal} onOpenChange={() => {
        setSelectedAccountSummary(null);
        setShowDebtsDetails(false);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              {selectedAccountSummary?.account?.name || 'تفاصيل الحساب'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAccountSummary && (
            <div className="space-y-4 mt-4">
              {/* Cumulative Cash Summary */}
              <div className={cn(
                'rounded-xl p-4',
                selectedAccountSummary.netCashBalance >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/20'
                  : 'bg-red-50 dark:bg-red-950/20'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">الرصيد التراكمي</span>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    selectedAccountSummary.netCashBalance >= 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  )}>
                    {selectedAccountSummary.netCashBalance >= 0 ? 'لنا' : 'علينا'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">لنا</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatNumber(selectedAccountSummary.cumulativeCashReceivable)} $
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">علينا</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatNumber(selectedAccountSummary.cumulativeCashPayable)} $
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">مدفوع</p>
                    <p className="text-lg font-bold text-teal-600">
                      {formatNumber(selectedAccountSummary.cumulativeCashPaid)} $
                    </p>
                  </div>
                </div>
                
                <div className={cn(
                  'pt-3 border-t',
                  selectedAccountSummary.netCashBalance >= 0 
                    ? 'border-emerald-200 dark:border-emerald-800' 
                    : 'border-red-200 dark:border-red-800'
                )}>
                  <p className="text-sm text-muted-foreground">الرصيد النهائي</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    selectedAccountSummary.netCashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {selectedAccountSummary.netCashBalance >= 0 ? '+' : ''}{formatNumber(selectedAccountSummary.netCashBalance)} $
                  </p>
                </div>
                
                {/* أزرار الإجراءات */}
                <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className={cn(
                      "flex-1",
                      selectedAccountSummary.netCashBalance === 0
                        ? "bg-gray-300 hover:bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-teal-500 hover:bg-teal-600"
                    )}
                    disabled={selectedAccountSummary.netCashBalance === 0}
                  >
                    <CreditCard className="w-4 h-4 ml-2" />
                    إضافة دفعة
                  </Button>
                </div>
              </div>

              {/* زر عرض جميع الحركات */}
              <Button
                variant="outline"
                onClick={() => setShowAllMovementsModal(true)}
                className="w-full justify-start gap-2 text-sm"
              >
                <List className="w-4 h-4" />
                عرض جميع الحركات
                <span className="text-xs text-muted-foreground mr-auto">
                  ({getUnifiedMovements(selectedAccountSummary, fromDate, toDate).length} حركة)
                </span>
              </Button>

              {/* Debts Details - Toggle Behavior */}
              {(selectedAccountSummary.cashDebts.length > 0 || selectedAccountSummary.deferredDebts.length > 0) && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDebtsDetails(!showDebtsDetails)}
                    className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Banknote className="w-4 h-4" />
                    {showDebtsDetails ? 'إخفاء تفاصيل الديون' : 'عرض تفاصيل الديون'}
                    <span className="text-xs">
                      ({selectedAccountSummary.cashDebts.length + selectedAccountSummary.deferredDebts.length})
                    </span>
                  </Button>
                  
                  {showDebtsDetails && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {[...selectedAccountSummary.cashDebts, ...selectedAccountSummary.deferredDebts].map(debt => {
                        const remaining = getRemainingForDebt(debt);
                        const paid = getPaidAmountForDebt(debt.id);
                        const isFullyPaid = remaining <= 0;
                        const isReceivable = debt.debtType === 'RECEIVABLE' || !debt.debtType;
                        const isCash = debt.debtMode === 'CASH';

                        return (
                          <div
                            key={debt.id}
                            className={cn(
                              'p-3 rounded-xl border',
                              isFullyPaid
                                ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50'
                                : isReceivable
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50'
                                  : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50'
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'p-1 rounded-full',
                                  isReceivable ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                )}>
                                  {isReceivable ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                </span>
                                <div>
                                  <p className="text-xs text-muted-foreground">{formatDate(debt.date)}</p>
                                  <div className="flex gap-1">
                                    <span className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded',
                                      isReceivable 
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                    )}>
                                      {isReceivable ? 'لنا' : 'علينا'}
                                    </span>
                                    <span className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded',
                                      isCash 
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    )}>
                                      {isCash ? 'نقدي' : 'آجل'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className={cn(
                                  'font-bold text-sm',
                                  isFullyPaid ? 'text-green-600' : isReceivable ? 'text-emerald-600' : 'text-red-600'
                                )}>
                                  {formatNumber(remaining)} $
                                </p>
                                {paid > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    من {formatNumber(debt.finalBalance)} $
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {debt.description && (
                              <p className="text-xs text-muted-foreground mb-2">{debt.description}</p>
                            )}

                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDebtClick(debt);
                                }}
                                className="text-xs h-7"
                              >
                                <Trash2 className="w-3 h-3 ml-1" />
                                حذف
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All Movements Modal */}
      <Dialog open={showAllMovementsModal} onOpenChange={setShowAllMovementsModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              جميع الحركات - {selectedAccountSummary?.account?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAccountSummary && (
            <div className="space-y-2 mt-4">
              {getUnifiedMovements(selectedAccountSummary, fromDate, toDate).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حركات
                </div>
              ) : (
                getUnifiedMovements(selectedAccountSummary, fromDate, toDate).map(movement => {
                  const isReceivable = movement.direction === 'RECEIVABLE';
                  const isCash = movement.mode === 'CASH';
                  const isOverflow = movement.type === 'PAYMENT' && movement.overflowTransactionId;

                  return (
                    <div
                      key={`${movement.type}-${movement.id}`}
                      className={cn(
                        'p-3 rounded-xl border',
                        isOverflow
                          ? 'bg-gray-50/50 dark:bg-gray-950/20 border-gray-200/50' // لون محايد للفائض
                          : movement.type === 'PAYMENT'
                            ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200/50'
                            : isReceivable
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50'
                              : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'p-1 rounded-full',
                            isOverflow
                              ? 'bg-gray-100 text-gray-600'
                              : movement.type === 'PAYMENT'
                                ? 'bg-teal-100 text-teal-600'
                                : isReceivable 
                                  ? 'bg-emerald-100 text-emerald-600' 
                                  : 'bg-red-100 text-red-600'
                          )}>
                            {movement.type === 'PAYMENT' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : isReceivable ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </span>
                          <div>
                            <p className="text-xs text-muted-foreground">{formatDate(movement.date)}</p>
                            <div className="flex gap-1 flex-wrap">
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                movement.type === 'PAYMENT'
                                  ? 'bg-teal-100 text-teal-700'
                                  : isReceivable 
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                              )}>
                                {movement.type === 'PAYMENT' ? 'دفعة' : isReceivable ? 'لنا' : 'علينا'}
                              </span>
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                isCash 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              )}>
                                {isCash ? 'نقدي' : 'آجل'}
                              </span>
                              {isOverflow && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                  مع فائض
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={cn(
                            'font-bold text-sm',
                            isOverflow
                              ? 'text-gray-600'
                              : movement.type === 'PAYMENT'
                                ? 'text-teal-600'
                                : isReceivable 
                                  ? 'text-emerald-600' 
                                  : 'text-red-600'
                          )}>
                            {formatNumber(movement.amount)} $
                          </p>
                          {movement.type === 'DEBT' && movement.remaining !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              متبقي: {formatNumber(movement.remaining)} $
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {movement.description && (
                        <p className="text-xs text-muted-foreground mb-2">{movement.description}</p>
                      )}

                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (movement.type === 'DEBT') {
                              handleDeleteDebtClick(movement.originalData as Debt);
                            } else {
                              handleDeletePaymentClick(movement.originalData as DebtPayment);
                            }
                          }}
                          className="text-xs h-7"
                        >
                          <Trash2 className="w-3 h-3 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة دفعة سداد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المبلغ ($)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="mt-1"
              />
              {selectedAccountSummary && (
                <p className="text-xs text-muted-foreground mt-1">
                  الرصيد التراكمي: {formatNumber(Math.abs(selectedAccountSummary.netCashBalance))} $
                  {selectedAccountSummary.netCashBalance >= 0 ? ' (لنا)' : ' (علينا)'}
                </p>
              )}
            </div>

            <div>
              <Label>نوع التسديد</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={paymentType === 'CASH' ? 'default' : 'outline'}
                  onClick={() => setPaymentType('CASH')}
                  className={cn(
                    'flex-1',
                    paymentType === 'CASH' ? 'bg-teal-500 hover:bg-teal-600' : ''
                  )}
                >
                  <Banknote className="w-4 h-4 ml-2" />
                  كاش
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'DEFERRED' ? 'default' : 'outline'}
                  onClick={() => setPaymentType('DEFERRED')}
                  className={cn(
                    'flex-1',
                    paymentType === 'DEFERRED' ? 'bg-purple-500 hover:bg-purple-600' : ''
                  )}
                >
                  <Clock className="w-4 h-4 ml-2" />
                  آجل
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {paymentType === 'CASH' 
                  ? '⚠️ الدفعة النقدية ستؤثر على الصندوق الفرعي والرئيسي'
                  : 'ℹ️ الدفعة الآجلة لا تؤثر على أي صندوق'
                }
              </p>
            </div>

            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Textarea
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="أضف ملاحظة..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleAddCumulativePayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isSubmitting}
              className="flex-1 bg-teal-500 hover:bg-teal-600"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'إضافة الدفعة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد الحذف
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                هل أنت متأكد من حذف هذا {deleteConfirm?.type === 'DEBT' ? 'الدين' : 'الدفعة'}؟
              </p>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">المبلغ: </span>
                  <span className="font-bold">{formatNumber(deleteConfirm?.data?.amount || 0)} $</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">النوع: </span>
                  <span className="font-bold">
                    {deleteConfirm?.type === 'DEBT' 
                      ? ((deleteConfirm?.data as Debt)?.debtMode || 'DEFERRED') === 'CASH' ? 'نقدي' : 'آجل'
                      : ((deleteConfirm?.data as DebtPayment)?.paymentMode || 'CASH') === 'CASH' ? 'نقدي' : 'آجل'
                    }
                  </span>
                </p>
                {deleteConfirm?.overflowAmount && deleteConfirm.overflowAmount > 0 && (
                  <p className="text-sm text-amber-600">
                    <span className="text-muted-foreground">⚠️ سيتم حذف حركة الفائض المرتبطة أيضاً</span>
                  </p>
                )}
              </div>
              {deleteConfirm?.type === 'DEBT' && (deleteConfirm?.data as Debt)?.debtMode === 'CASH' && (
                <p className="text-xs text-muted-foreground">
                  ℹ️ سيتم عكس التأثير على الصندوق الفرعي والرئيسي
                </p>
              )}
              {deleteConfirm?.type === 'DEBT' && (deleteConfirm?.data as Debt)?.debtMode !== 'CASH' && (
                <p className="text-xs text-muted-foreground">
                  ℹ️ لن يتأثر الصندوق (دين آجل)
                </p>
              )}
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overpayment Dialog */}
      <AlertDialog open={showOverpaymentDialog} onOpenChange={setShowOverpaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              تنبيه: الدفعة أكبر من المطلوب
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                المبلغ المدخل: <span className="font-bold">{formatNumber(pendingPaymentAmount)} $</span>
              </p>
              <p>
                المبلغ المطلوب: <span className="font-bold">{formatNumber(Math.abs(selectedAccountSummary?.netCashBalance || 0))} $</span>
              </p>
              <p>
                الفائض: <span className="font-bold text-amber-600">{formatNumber(overpaymentAmount)} $</span>
              </p>
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">سيتم:</p>
                <ol className="text-sm list-decimal list-inside space-y-1">
                  <li>تسديد الدين بالكامل وتصفير الحساب</li>
                  <li>
                    إنشاء حركة "{selectedAccountSummary && selectedAccountSummary.netCashBalance >= 0 ? 'علينا' : 'لنا'}" بقيمة {formatNumber(overpaymentAmount)} $ (حساب خاص)
                  </li>
                </ol>
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowOverpaymentDialog(false);
              setOverpaymentAmount(0);
              setPendingPaymentAmount(0);
            }}>
              إلغاء العملية
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => executePayment(pendingPaymentAmount, true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              تنفيذ مع معالجة الفرق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
