'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, AlertCircle, CreditCard, Trash2, ArrowUpRight, ArrowDownRight, Banknote, Clock, ChevronLeft, AlertTriangle, CheckCircle, List, X, ChevronDown, ChevronUp, Pencil, HandCoins, Scale, TrendingUp } from 'lucide-react';
import { DebtModal } from './DebtModal';
import { MultiCurrencyPaymentModal } from './MultiCurrencyPaymentModal';
import { EditMovementModal } from './EditMovementModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { Debt, DebtPayment } from '@/lib/supabaseDb';
import { getAccountDebtSummary, deleteTransaction, updateDebtPayment, type AccountDebtSummary } from '@/lib/supabaseDb';
import { groupByMonth } from '@/lib/monthlyGrouping';

// واجهة للحركة الموحدة (دين أو دفعة)
interface UnifiedMovement {
  id: string;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
  date: Date;
  direction: 'RECEIVABLE' | 'PAYABLE'; // لنا أو علينا
  mode: 'CASH' | 'DEFERRED';
  description?: string | null;
  remaining?: number;
  originalData: Debt | DebtPayment;
  overflowTransactionId?: string | null;
}

// واجهة للملخص التراكمي حسب العملة
interface CurrencyCumulativeSummary {
  currencyId: string;
  cashReceivable: number;
  cashPayable: number;
  cashPaid: number;
  deferredReceivable: number;
  deferredPayable: number;
  deferredPaid: number;
  netBalance: number;  // positive = لنا, negative = علينا (same currency only)
}

// واجهة للحساب مع الإجمالي التراكمي
interface CumulativeAccountSummary extends Omit<AccountDebtSummary, 'currencyBreakdown'> {
  // الديون النقدية فقط
  cashDebts: Debt[];
  deferredDebts: Debt[];
  // الإجمالي التراكمي للديون النقدية
  cumulativeCashReceivable: number;    // إجمالي الديون النقدية لنا
  cumulativeCashPayable: number;       // إجمالي الديون النقدية علينا
  cumulativeCashPaid: number;          // إجمالي المدفوع من الديون النقدية
  cumulativeCashRemaining: number;     // المتبقي التراكمي = لنا - علينا - مدفوع
  // صافي الديون النقدية - ⚠️ يدمج عملات مختلفة! لا تستخدمه للعرض أو الحسابات، استخدم currencyBreakdown بدلاً من ذلك
  netCashBalance: number;              // صافي النقدية = (لنا - علينا) - مدفوع (للتوافق فقط)
  // معلومات إضافية لمعالجة الدفعات الزائدة
  primaryDebtMode: 'CASH' | 'DEFERRED';  // نوع الدين الأساسي
  // الملخص التراكمي حسب العملة
  currencyBreakdown: CurrencyCumulativeSummary[];
}

// واجهة مساعدة للتجميع الشهري للحركات
interface MovementForGrouping {
  date: string;
  movement: UnifiedMovement;
}

// مكون مجموعة شهرية للديون (تجميع بسيط بدون حسابات مالية)
function DebtMonthGroup({
  label,
  count,
  defaultExpanded = false,
  children,
}: {
  label: string;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border bg-card overflow-hidden transition-all duration-200 border-l-[3px] border-l-amber-500 dark:border-l-amber-400">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full text-right p-3 flex items-center justify-between transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60"
      >
        <div className="flex items-center gap-2">
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground">
            <ChevronDown className="w-4 h-4" />
          </motion.span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          عدد العمليات: {count}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DebtsPage() {
  const { accounts, openDebtModal, currencies } = useAppStore();
  const { debtRemaining, debtPayments, addDebtPayment, deleteDebtPayment, deleteDebt, refreshData, addTransaction } = useSupabaseData();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAccountSummary, setSelectedAccountSummary] = useState<CumulativeAccountSummary | null>(null);
  const [accountSummaries, setAccountSummaries] = useState<CumulativeAccountSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  // حالة نافذة الدفع متعدد العملات
  const [showMultiCurrencyPaymentModal, setShowMultiCurrencyPaymentModal] = useState(false);
  
  // حالة إظهار/إخفاء تفاصيل الديون
  const [showDebtsDetails, setShowDebtsDetails] = useState(false);

  // ============================================
  // 🔸 حسابات الديون حسب العملة — كل عملة كيان مستقل
  // ============================================

  // بناء خريطة العملات للوصول السريع
  const debtCurrencyMap = useMemo(() => new Map(currencies.map(c => [c.id, c])), [currencies]);

  // تقسيم الأصول (لنا) حسب العملة
  const receivableByCurrency = useMemo(() =>
    debtRemaining.currencyBreakdown
      .filter(cb => cb.receivableRemaining > 0)
      .map(cb => ({
        ...cb,
        currency: debtCurrencyMap.get(cb.currencyId),
      }))
      .sort((a, b) => b.receivableRemaining - a.receivableRemaining)
  , [debtRemaining.currencyBreakdown, debtCurrencyMap]);

  // تقسيم الالتزامات (علينا) حسب العملة
  const payableByCurrency = useMemo(() =>
    debtRemaining.currencyBreakdown
      .filter(cb => cb.payableRemaining > 0)
      .map(cb => ({
        ...cb,
        currency: debtCurrencyMap.get(cb.currencyId),
      }))
      .sort((a, b) => b.payableRemaining - a.payableRemaining)
  , [debtRemaining.currencyBreakdown, debtCurrencyMap]);

  // تقسيم صافي الديون حسب العملة
  const netByCurrency = useMemo(() =>
    debtRemaining.currencyBreakdown
      .filter(cb => cb.receivableRemaining > 0 || cb.payableRemaining > 0)
      .map(cb => ({
        currencyId: cb.currencyId,
        net: cb.receivableRemaining - cb.payableRemaining,
        currency: debtCurrencyMap.get(cb.currencyId),
      }))
      .filter(item => item.net !== 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  , [debtRemaining.currencyBreakdown, debtCurrencyMap]);
  
  // حالة نافذة جميع الحركات
  const [showAllMovementsModal, setShowAllMovementsModal] = useState(false);
  
  // حالة تأكيد الحذف
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'DEBT' | 'PAYMENT';
    data: Debt | DebtPayment;
    overflowAmount?: number;
  } | null>(null);

  // حالة نافذة تعديل الحركة
  const [editingMovement, setEditingMovement] = useState<{
    type: 'DEBT' | 'PAYMENT';
    originalData: Debt | DebtPayment;
    direction: 'RECEIVABLE' | 'PAYABLE';
    mode: 'CASH' | 'DEFERRED';
  } | null>(null);

  // حالة الضغط المطول
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // معالج الضغط المطول - يفتح نافذة التعديل مباشرة
  const handleLongPressStart = (movement: UnifiedMovement) => {
    longPressTimerRef.current = setTimeout(() => {
      handleEditMovement(movement);
    }, 500); // 500ms للضغط المطول
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleEditMovement = (movement: UnifiedMovement) => {
    setEditingMovement({
      type: movement.type,
      originalData: movement.originalData,
      direction: movement.direction,
      mode: movement.mode,
    });
  };

  // إعادة تحميل البيانات بعد التعديل
  const handleEditSaved = async () => {
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
  };

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
    
    // ترتيب حسب التاريخ (الأحدث أولاً)، ثم بوقت الإنشاء كعامل ثانوي
    return movements.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // ترتيب ثانوي: الأحدث إنشاءً أولاً عند تساوي التاريخ
      const aCreated = new Date(a.originalData.createdAt).getTime();
      const bCreated = new Date(b.originalData.createdAt).getTime();
      return bCreated - aCreated;
    });
  }, [debtPayments]);

  // دالة مساعدة للحصول على رمز العملة
  const getCurrencySymbol = (currencyId: string): string => {
    return currencies.find(c => c.id === currencyId)?.symbol || '$';
  };

  // حساب الملخص التراكمي للحساب
  const calculateCumulativeSummary = (summary: AccountDebtSummary): CumulativeAccountSummary => {
    // فصل الديون النقدية عن الآجلة
    const cashDebts = summary.debts.filter(d => d.debtMode === 'CASH');
    const deferredDebts = summary.debts.filter(d => d.debtMode === 'DEFERRED' || !d.debtMode);

    // ============================================
    // 🔹 حسابات حسب العملة (لا ندمج عملات مختلفة)
    // ============================================
    const allDebts = [...cashDebts, ...deferredDebts];
    const currencyIds = [...new Set(allDebts.map(d => d.currencyId))];

    const currencyBreakdown: CurrencyCumulativeSummary[] = currencyIds.map(currencyId => {
      const currencyCashDebts = cashDebts.filter(d => d.currencyId === currencyId);
      const currencyDeferredDebts = deferredDebts.filter(d => d.currencyId === currencyId);

      let cashReceivable = 0;
      let cashPayable = 0;
      let cashPaid = 0;

      for (const debt of currencyCashDebts) {
        const paid = getPaidAmountForDebt(debt.id);
        cashPaid += paid;
        if (debt.debtType === 'RECEIVABLE' || !debt.debtType) {
          cashReceivable += debt.finalBalance;
        } else {
          cashPayable += debt.finalBalance;
        }
      }

      let deferredReceivable = 0;
      let deferredPayable = 0;
      let deferredPaid = 0;

      for (const debt of currencyDeferredDebts) {
        const paid = getPaidAmountForDebt(debt.id);
        deferredPaid += paid;
        if (debt.debtType === 'RECEIVABLE' || !debt.debtType) {
          deferredReceivable += debt.finalBalance;
        } else {
          deferredPayable += debt.finalBalance;
        }
      }

      // حساب الدفعات حسب الاتجاه لهذه العملة فقط
      let receivablePayments = 0;
      let payablePayments = 0;

      const currencyAllDebts = [...currencyCashDebts, ...currencyDeferredDebts];
      for (const debt of currencyAllDebts) {
        const payments = getPaymentsForDebt(debt.id);
        for (const payment of payments) {
          const direction = payment.paymentDirection || debt.debtType || 'RECEIVABLE';
          if (direction === 'RECEIVABLE') {
            receivablePayments += payment.amount;
          } else {
            payablePayments += payment.amount;
          }
        }
      }

      const receivableTransactions = cashReceivable + deferredReceivable;
      const payableTransactions = cashPayable + deferredPayable;
      const netBalance = receivableTransactions - payableTransactions + receivablePayments - payablePayments;

      return {
        currencyId,
        cashReceivable,
        cashPayable,
        cashPaid,
        deferredReceivable,
        deferredPayable,
        deferredPaid,
        netBalance,
      };
    });

    // ============================================
    // 🔹 حساب الديون النقدية (إجمالي لكل العملات - للتوافق)
    // ⚠️ تحذير: هذه القيم تدمج عملات مختلفة ولا يجب استخدامها للعرض أو الحسابات
    // 🔸 استخدم currencyBreakdown بدلاً من ذلك
    // ============================================
    let cashReceivable = 0;   // ديون نقدية لنا (يدمج عملات مختلفة - للتوافق فقط)
    let cashPayable = 0;      // ديون نقدية علينا (يدمج عملات مختلفة - للتوافق فقط)
    let cashPaid = 0;         // مدفوع من الديون النقدية (يدمج عملات مختلفة - للتوافق فقط)

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
    // 🔹 حساب الديون الآجلة (إجمالي لكل العملات - للتوافق)
    // ⚠️ تحذير: هذه القيم تدمج عملات مختلفة ولا يجب استخدامها للعرض أو الحسابات
    // ============================================
    let deferredReceivable = 0;   // ديون آجلة لنا (يدمج عملات مختلفة - للتوافق فقط)
    let deferredPayable = 0;      // ديون آجلة علينا (يدمج عملات مختلفة - للتوافق فقط)
    let deferredPaid = 0;         // مدفوع من الديون الآجلة (يدمج عملات مختلفة - للتوافق فقط)

    for (const debt of deferredDebts) {
      const paid = getPaidAmountForDebt(debt.id);
      deferredPaid += paid;

      if (debt.debtType === 'RECEIVABLE' || !debt.debtType) {
        deferredReceivable += debt.finalBalance;
      } else {
        deferredPayable += debt.finalBalance;
      }
    }
    
    // إجمالي الحركات (الديون) لنا (نقد + آجل)
    const receivableTransactions = cashReceivable + deferredReceivable;
    
    // إجمالي الحركات (الديون) علينا (نقد + آجل)
    const payableTransactions = cashPayable + deferredPayable;
    
    // ============================================
    // 🔹 حساب الدفعات حسب الاتجاه
    // ============================================
    let receivablePayments = 0;  // دفعات لنا
    let payablePayments = 0;     // دفعات علينا
    
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
    
    // ============================================
    // 🔹 المعادلة الصحيحة للرصيد النهائي (للتوافق)
    // ⚠️ تحذير: netCashBalance يدمج عملات مختلفة - لا تستخدمه للعرض أو الحسابات
    // 🔸 استخدم currencyBreakdown[i].netBalance بدلاً من ذلك
    // ============================================
    const netCashBalance = 
      receivableTransactions    // ديون لنا (موجب) - يدمج عملات مختلفة!
      - payableTransactions     // ديون علينا (سالب) - يدمج عملات مختلفة!
      + receivablePayments      // دفعات لنا (موجب) - يدمج عملات مختلفة!
      - payablePayments;        // دفعات علينا (سالب) - يدمج عملات مختلفة!

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
      // الملخص حسب العملة
      currencyBreakdown,
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

  // ============================================
  // 🔹 تحديد حالة رصيد الحساب من العملات (لا ندمج عملات مختلفة)
  // ============================================
  const getAccountBalanceState = (summary: CumulativeAccountSummary): 'zero' | 'positive' | 'negative' => {
    const hasPositiveCurrency = summary.currencyBreakdown.some(cb => cb.netBalance > 0);
    const hasNegativeCurrency = summary.currencyBreakdown.some(cb => cb.netBalance < 0);
    const allZero = summary.currencyBreakdown.every(cb => cb.netBalance === 0) || summary.currencyBreakdown.length === 0;
    if (allZero) return 'zero';
    if (hasPositiveCurrency && !hasNegativeCurrency) return 'positive';
    if (hasNegativeCurrency && !hasPositiveCurrency) return 'negative';
    // مختلط: نستخدم اتجاه أول رصيد غير صفري
    const firstNonZero = summary.currencyBreakdown.find(cb => cb.netBalance !== 0);
    if (firstNonZero && firstNonZero.netBalance > 0) return 'positive';
    return 'negative';
  };

  // هل جميع أرصدة العملات صفرية؟
  const isAllCurrencyBalancesZero = (summary: CumulativeAccountSummary): boolean => {
    return summary.currencyBreakdown.every(cb => cb.netBalance === 0) || summary.currencyBreakdown.length === 0;
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
  // 🔸 حماية: منع الحذف إذا كان الدين مرتبطاً بدفعات أو فائض
  // 🔸 المسار الصحيح: حذف الدفعات أولاً → حذف الفائض تلقائياً → ثم حذف الدين
  // ============================================
  const handleDeleteDebtClick = (debt: Debt) => {
    // التحقق من وجود دفعات مرتبطة بهذا الدين
    const payments = getPaymentsForDebt(debt.id);
    const hasPayments = payments.length > 0;
    // التحقق من وجود فائض مرتبط بأي دفعة
    const hasOverflow = payments.some(p => p.overflowTransactionId);

    if (hasPayments || hasOverflow) {
      toast({
        title: 'لا يمكن الحذف',
        description: 'يجب حذف جميع الدفعات والفائض المرتبط قبل حذف الدين',
        variant: 'destructive',
      });
      return;
    }

    setDeleteConfirm({
      type: 'DEBT',
      data: debt,
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
        const payment = deleteConfirm.data as DebtPayment;
        // 🔸 حذف الفائض المرتبط بالدفعة تلقائياً قبل حذف الدفعة
        if (payment.overflowTransactionId) {
          try {
            await deleteTransaction(payment.overflowTransactionId);
          } catch (e) {
            console.error('Error deleting overflow transaction:', e);
          }
        }
        await deleteDebtPayment(payment.id);
        toast({
          title: 'تم الحذف',
          description: payment.overflowTransactionId
            ? 'تم حذف الدفعة والفائض المرتبط بها'
            : 'تم حذف الدفعة بنجاح',
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
      {/* Header — Sticky */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/30">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">الديون</h1>
              <p className="text-sm text-muted-foreground">
                {debtRemaining.unpaidDebtsCount} دين مستحق
              </p>
            </div>
          </div>
          <Button
            onClick={() => openDebtModal()}
            className="gap-2 rounded-full bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </motion.div>
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

      {/* ============================================ */}
      {/* 🔸 ملخص الديون — كل عملة بشكل مستقل */}
      {/* ============================================ */}
      <div className="space-y-3">
        {/* عنوان القسم مع زر إظهار/إخفاء التفاصيل */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">ملخص الديون</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebtsDetails(!showDebtsDetails)}
            className="gap-1 text-xs"
          >
            {showDebtsDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                إخفاء التفاصيل
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                إظهار التفاصيل
              </>
            )}
          </Button>
        </div>

        {/* 🔸 بطاقات الأصول والالتزامات — مفصولة حسب العملة */}
        <div className="grid grid-cols-2 gap-3">
          {/* بطاقة الأصول (الديون لنا) — أخضر فاتح */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-4 shadow-md border border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">الأصول (لنا)</p>
            </div>
            {/* 🔸 عرض كل عملة بشكل مستقل */}
            {receivableByCurrency.length > 0 ? (
              <div className="space-y-1">
                {receivableByCurrency.map(cb => (
                  <div key={cb.currencyId} className="flex items-baseline justify-between gap-1">
                    <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{cb.currency?.symbol || '?'}</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap" dir="ltr">
                      {formatNumber(cb.receivableRemaining)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300" dir="ltr">0</p>
            )}
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">المتبقي لنا</p>
          </motion.div>

          {/* بطاقة الالتزامات (الديون علينا) — أحمر فاتح */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-red-50 dark:bg-red-950/50 p-4 shadow-md border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 rotate-180 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">الالتزامات (علينا)</p>
            </div>
            {/* 🔸 عرض كل عملة بشكل مستقل */}
            {payableByCurrency.length > 0 ? (
              <div className="space-y-1">
                {payableByCurrency.map(cb => (
                  <div key={cb.currencyId} className="flex items-baseline justify-between gap-1">
                    <span className="text-xs text-red-600/70 dark:text-red-400/70">{cb.currency?.symbol || '?'}</span>
                    <span className="text-sm sm:text-base font-bold text-red-700 dark:text-red-300 whitespace-nowrap" dir="ltr">
                      {formatNumber(cb.payableRemaining)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-red-700 dark:text-red-300" dir="ltr">0</p>
            )}
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">المتبقي علينا</p>
          </motion.div>
        </div>

        {/* 🔸 بطاقة صافي الديون — مفصولة حسب العملة */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "rounded-xl p-4 shadow-md border",
            netByCurrency.every(item => item.net > 0)
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
              : netByCurrency.every(item => item.net < 0)
                ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800"
                : "bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">صافي الديون</p>
                <p className="text-xs text-muted-foreground">الأصول - الالتزامات</p>
              </div>
            </div>
            <div className="text-left">
              {/* 🔸 عرض كل عملة بشكل مستقل */}
              {netByCurrency.length > 0 ? (
                <div className="space-y-1">
                  {netByCurrency.map(item => (
                    <div key={item.currencyId} className="flex items-baseline justify-end gap-1">
                      <span className={cn(
                        "text-xs",
                        item.net > 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-600/70 dark:text-red-400/70'
                      )}>{item.currency?.symbol || '?'}</span>
                      <span className={cn(
                        "text-sm sm:text-base font-bold whitespace-nowrap",
                        item.net > 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : item.net < 0
                            ? "text-red-700 dark:text-red-300"
                            : "text-gray-700 dark:text-gray-300"
                      )} dir="ltr">
                        {item.net >= 0 ? '' : '-'}{formatNumber(Math.abs(item.net))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300" dir="ltr">0</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* 🔸 تفاصيل الديون حسب العملة (قابلة للإظهار/الإخفاء) */}
        <AnimatePresence>
          {showDebtsDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 overflow-hidden"
            >
              {/* 🔸 تفاصيل الأصول — حسب العملة */}
              <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  تفاصيل الأصول (لنا)
                </h3>
                {debtRemaining.currencyBreakdown.filter(cb => cb.receivable > 0).length > 0 ? (
                  <div className="space-y-3">
                    {debtRemaining.currencyBreakdown
                      .filter(cb => cb.receivable > 0)
                      .sort((a, b) => b.receivable - a.receivable)
                      .map(cb => {
                        const cur = debtCurrencyMap.get(cb.currencyId);
                        return (
                          <div key={cb.currencyId} className="space-y-1.5 pb-2 border-b border-border/50 last:border-0 last:pb-0">
                            <p className="text-xs font-medium text-muted-foreground">{cur?.name || cb.currencyId} ({cur?.symbol || '?'})</p>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">➜ الإجمالي:</span>
                                <span className="font-semibold text-emerald-600" dir="ltr">{formatNumber(cb.receivable)} {cur?.symbol}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">➜ المدفوع:</span>
                                <span className="font-medium text-emerald-600" dir="ltr">{formatNumber(cb.receivablePaid)} {cur?.symbol}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-border/30">
                                <span>➜ المتبقي:</span>
                                <span className="text-emerald-600" dir="ltr">{formatNumber(cb.receivableRemaining)} {cur?.symbol}</span>
                              </div>
                              {/* تفصيل نقدي/آجل */}
                              {(cb.cashReceivable > 0 || cb.deferredReceivable > 0) && (
                                <div className="flex gap-3 text-[10px] text-muted-foreground">
                                  {cb.cashReceivableRemaining > 0 && <span>نقدي: {formatNumber(cb.cashReceivableRemaining)} {cur?.symbol}</span>}
                                  {cb.deferredReceivableRemaining > 0 && <span>آجل: {formatNumber(cb.deferredReceivableRemaining)} {cur?.symbol}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد أصول</p>
                )}
              </div>

              {/* 🔸 تفاصيل الالتزامات — حسب العملة */}
              <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  تفاصيل الالتزامات (علينا)
                </h3>
                {debtRemaining.currencyBreakdown.filter(cb => cb.payable > 0).length > 0 ? (
                  <div className="space-y-3">
                    {debtRemaining.currencyBreakdown
                      .filter(cb => cb.payable > 0)
                      .sort((a, b) => b.payable - a.payable)
                      .map(cb => {
                        const cur = debtCurrencyMap.get(cb.currencyId);
                        return (
                          <div key={cb.currencyId} className="space-y-1.5 pb-2 border-b border-border/50 last:border-0 last:pb-0">
                            <p className="text-xs font-medium text-muted-foreground">{cur?.name || cb.currencyId} ({cur?.symbol || '?'})</p>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">➜ الإجمالي:</span>
                                <span className="font-semibold text-red-600" dir="ltr">{formatNumber(cb.payable)} {cur?.symbol}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">➜ المدفوع:</span>
                                <span className="font-medium text-red-600" dir="ltr">{formatNumber(cb.payablePaid)} {cur?.symbol}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-border/30">
                                <span>➜ المتبقي:</span>
                                <span className="text-red-600" dir="ltr">{formatNumber(cb.payableRemaining)} {cur?.symbol}</span>
                              </div>
                              {/* تفصيل نقدي/آجل */}
                              {(cb.cashPayable > 0 || cb.deferredPayable > 0) && (
                                <div className="flex gap-3 text-[10px] text-muted-foreground">
                                  {cb.cashPayableRemaining > 0 && <span>نقدي: {formatNumber(cb.cashPayableRemaining)} {cur?.symbol}</span>}
                                  {cb.deferredPayableRemaining > 0 && <span>آجل: {formatNumber(cb.deferredPayableRemaining)} {cur?.symbol}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد التزامات</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              const balanceState = getAccountBalanceState(summary);
              const isPositiveBalance = balanceState === 'positive';
              const isNegativeBalance = balanceState === 'negative';
              const isZeroBalance = balanceState === 'zero';
              
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
                        {summary.currencyBreakdown.length === 0 ? (
                          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">0</p>
                        ) : summary.currencyBreakdown.length === 1 ? (
                          <p className={cn(
                            'text-2xl font-bold',
                            summary.currencyBreakdown[0].netBalance === 0
                              ? 'text-gray-600 dark:text-gray-400'
                              : summary.currencyBreakdown[0].netBalance > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                          )}>
                            {summary.currencyBreakdown[0].netBalance === 0 ? '0' : `${summary.currencyBreakdown[0].netBalance > 0 ? '+' : ''}${formatNumber(summary.currencyBreakdown[0].netBalance)}`} {getCurrencySymbol(summary.currencyBreakdown[0].currencyId)}
                          </p>
                        ) : (
                          <div className="space-y-0.5">
                            {summary.currencyBreakdown.map(cb => {
                              const isCbPositive = cb.netBalance > 0;
                              const isCbZero = cb.netBalance === 0;
                              return (
                                <p key={cb.currencyId} className={cn(
                                  'text-base font-bold',
                                  isCbZero
                                    ? 'text-gray-600 dark:text-gray-400'
                                    : isCbPositive
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                )}>
                                  {isCbZero ? '0' : `${isCbPositive ? '+' : ''}${formatNumber(cb.netBalance)}`} {getCurrencySymbol(cb.currencyId)}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {summary.currencyBreakdown.length <= 1 ? (
                        <>
                          <div className="bg-emerald-100/50 dark:bg-emerald-900/20 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-xs text-emerald-700 dark:text-emerald-400">لنا نقدي</span>
                            </div>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatNumber(summary.cumulativeCashReceivable)} {getCurrencySymbol(summary.currencyBreakdown[0]?.currencyId || '')}
                            </p>
                          </div>
                          
                          <div className="bg-red-100/50 dark:bg-red-900/20 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Banknote className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-xs text-red-700 dark:text-red-400">علينا نقدي</span>
                            </div>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              {formatNumber(summary.cumulativeCashPayable)} {getCurrencySymbol(summary.currencyBreakdown[0]?.currencyId || '')}
                            </p>
                          </div>
                          
                          <div className="bg-teal-100/50 dark:bg-teal-900/20 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                              <span className="text-xs text-teal-700 dark:text-teal-400">مدفوع</span>
                            </div>
                            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                              {formatNumber(summary.cumulativeCashPaid)} {getCurrencySymbol(summary.currencyBreakdown[0]?.currencyId || '')}
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
                        </>
                      ) : (
                        <>
                          <div className="bg-emerald-100/50 dark:bg-emerald-900/20 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-xs text-emerald-700 dark:text-emerald-400">لنا نقدي</span>
                            </div>
                            <div className="space-y-0.5">
                              {summary.currencyBreakdown.map(cb => (
                                <p key={cb.currencyId} className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatNumber(cb.cashReceivable)} {getCurrencySymbol(cb.currencyId)}
                                </p>
                              ))}
                            </div>
                          </div>
                          
                          <div className="bg-red-100/50 dark:bg-red-900/20 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Banknote className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-xs text-red-700 dark:text-red-400">علينا نقدي</span>
                            </div>
                            <div className="space-y-0.5">
                              {summary.currencyBreakdown.map(cb => (
                                <p key={cb.currencyId} className="text-sm font-bold text-red-600 dark:text-red-400">
                                  {formatNumber(cb.cashPayable)} {getCurrencySymbol(cb.currencyId)}
                                </p>
                              ))}
                            </div>
                          </div>
                          
                          <div className="bg-teal-100/50 dark:bg-teal-900/20 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                              <span className="text-xs text-teal-700 dark:text-teal-400">مدفوع</span>
                            </div>
                            <div className="space-y-0.5">
                              {summary.currencyBreakdown.map(cb => (
                                <p key={cb.currencyId} className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                  {formatNumber(cb.cashPaid)} {getCurrencySymbol(cb.currencyId)}
                                </p>
                              ))}
                            </div>
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
                        </>
                      )}
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
              {/* Per-Currency Summary */}
              {selectedAccountSummary.currencyBreakdown.map(cb => {
                const isPositive = cb.netBalance > 0;
                const isZero = cb.netBalance === 0;
                const currencySymbol = getCurrencySymbol(cb.currencyId);
                return (
                  <div key={cb.currencyId} className={cn(
                    'rounded-xl p-4',
                    isZero
                      ? 'bg-gray-50 dark:bg-gray-950/20'
                      : isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-950/20'
                        : 'bg-red-50 dark:bg-red-950/20'
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-amber-600" />
                        <span className="font-medium">الرصيد التراكمي</span>
                        <span className="text-xs text-muted-foreground">({currencySymbol})</span>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        isZero
                          ? 'bg-gray-100 text-gray-700'
                          : isPositive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                      )}>
                        {isZero ? 'متوازن' : isPositive ? 'لنا' : 'علينا'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">لنا</p>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatNumber(cb.cashReceivable + cb.deferredReceivable)} {currencySymbol}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">علينا</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatNumber(cb.cashPayable + cb.deferredPayable)} {currencySymbol}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">مدفوع</p>
                        <p className="text-lg font-bold text-teal-600">
                          {formatNumber(cb.cashPaid + cb.deferredPaid)} {currencySymbol}
                        </p>
                      </div>
                    </div>
                    
                    <div className={cn(
                      'pt-3 border-t',
                      isZero 
                        ? 'border-gray-200 dark:border-gray-800' 
                        : isPositive 
                          ? 'border-emerald-200 dark:border-emerald-800' 
                          : 'border-red-200 dark:border-red-800'
                    )}>
                      <p className="text-sm text-muted-foreground">الرصيد النهائي</p>
                      <p className={cn(
                        'text-2xl font-bold',
                        isZero ? 'text-gray-600' : isPositive ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {isZero ? '0' : `${isPositive ? '+' : ''}${formatNumber(cb.netBalance)}`} {currencySymbol}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* أزرار الإجراءات */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowMultiCurrencyPaymentModal(true)}
                  className={cn(
                    "flex-1",
                    isAllCurrencyBalancesZero(selectedAccountSummary)
                      ? "bg-gray-300 hover:bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-teal-500 hover:bg-teal-600"
                  )}
                  disabled={isAllCurrencyBalancesZero(selectedAccountSummary)}
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  إضافة دفعة
                </Button>
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
                                  {formatNumber(remaining)} {getCurrencySymbol(debt.currencyId)}
                                </p>
                                {paid > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    من {formatNumber(debt.finalBalance)} {getCurrencySymbol(debt.currencyId)}
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
          
          {selectedAccountSummary && (() => {
            const movements = getUnifiedMovements(selectedAccountSummary, fromDate, toDate);
            
            if (movements.length === 0) {
              return (
                <div className="space-y-2 mt-4">
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد حركات
                  </div>
                </div>
              );
            }

            // تحويل الحركات إلى عناصر بتاريخ نصي للتجميع الشهري
            const itemsForGrouping: MovementForGrouping[] = movements.map(m => ({
              date: m.date instanceof Date
                ? `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}-${String(m.date.getDate()).padStart(2, '0')}`
                : String(m.date),
              movement: m,
            }));
            const groups = groupByMonth(itemsForGrouping);

            return (
              <div className="space-y-3 mt-4">
                {groups.map((group, groupIndex) => (
                  <DebtMonthGroup
                    key={group.key}
                    label={group.label}
                    count={group.items.length}
                    defaultExpanded={groupIndex === 0}
                  >
                    {group.items.map(({ movement }) => {
                      const isReceivable = movement.direction === 'RECEIVABLE';
                      const isCash = movement.mode === 'CASH';
                      const isOverflow = movement.type === 'PAYMENT' && movement.overflowTransactionId;

                      return (
                        <div
                          key={`${movement.type}-${movement.id}`}
                          className={cn(
                            'p-3 rounded-xl border select-none',
                            isOverflow
                              ? 'bg-gray-50/50 dark:bg-gray-950/20 border-gray-200/50' // لون محايد للفائض
                              : movement.type === 'PAYMENT'
                                ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200/50'
                                : isReceivable
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50'
                                  : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50'
                          )}
                          onTouchStart={() => handleLongPressStart(movement)}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                          onMouseDown={() => handleLongPressStart(movement)}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleEditMovement(movement);
                          }}
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
                                {formatNumber(movement.amount)} {getCurrencySymbol((movement.originalData as Debt).currencyId || (movement.originalData as DebtPayment).currencyId)}
                              </p>
                              {movement.type === 'DEBT' && movement.remaining !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  متبقي: {formatNumber(movement.remaining)} {getCurrencySymbol((movement.originalData as Debt).currencyId)}
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
                              variant="outline"
                              onClick={() => handleEditMovement(movement)}
                              className="text-xs h-7"
                            >
                              <Pencil className="w-3 h-3 ml-1" />
                              تعديل
                            </Button>
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
                    })}
                  </DebtMonthGroup>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Multi-Currency Payment Modal */}
      <MultiCurrencyPaymentModal
        isOpen={showMultiCurrencyPaymentModal}
        onClose={() => setShowMultiCurrencyPaymentModal(false)}
        accountSummary={selectedAccountSummary}
        currencies={currencies}
        debtPayments={debtPayments}
        onAddDebtPayment={async (params) => { const result = await addDebtPayment(params); return { id: result.id }; }}
        onAddTransaction={addTransaction}
        onUpdateDebtPayment={async (id, data) => { await updateDebtPayment(id, data); }}
        onPaymentComplete={async () => {
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
        }}
        getRemainingForDebt={getRemainingForDebt}
        getPaidAmountForDebt={getPaidAmountForDebt}
      />

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
                  <span className="font-bold">{formatNumber(deleteConfirm?.data?.amount || 0)} {getCurrencySymbol((deleteConfirm?.data as Debt)?.currencyId || (deleteConfirm?.data as DebtPayment)?.currencyId || '')}</span>
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

      {/* Edit Movement Modal */}
      <EditMovementModal
        isOpen={!!editingMovement}
        onClose={() => setEditingMovement(null)}
        movement={editingMovement}
        onSaved={handleEditSaved}
      />


    </div>
  );
}
