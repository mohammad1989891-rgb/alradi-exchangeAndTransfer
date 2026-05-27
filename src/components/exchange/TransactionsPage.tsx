'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ArrowLeftRight, Filter, Edit, Trash2, Calendar, X, Clock, CheckCircle2 } from 'lucide-react';
import { TransactionCard } from './TransactionCard';
import { TransactionModal } from './TransactionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';

export function TransactionsPage() {
  const {
    transactions,
    openTransactionModal,
    isTransactionModalOpen,
    closeTransactionModal
  } = useAppStore();
  const { deleteTransaction } = useLocalData();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [filterPaymentType, setFilterPaymentType] = useState<'all' | 'CASH' | 'DEFERRED' | 'INCOMPLETE'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteTransactionState, setDeleteTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // هل يوجد فلتر تاريخ مفعل
  const hasDateFilter = fromDate || toDate;

  // تنظيف فلتر التاريخ
  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  const filteredTransactions = useMemo(() => {
    // تطبيق الفلاتر
    let result = transactions.filter(t => {
      const matchesSearch =
        t.account?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesPaymentType = filterPaymentType === 'all' 
        || (filterPaymentType === 'INCOMPLETE' && !t.isComplete)
        || (filterPaymentType === 'CASH' && t.paymentType === 'CASH' && t.isComplete !== false)
        || (filterPaymentType === 'DEFERRED' && t.paymentType === 'DEFERRED' && t.isComplete !== false);

      // فلتر التاريخ
      let matchesDate = true;
      if (fromDate || toDate) {
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && txDate >= from;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && txDate <= to;
        }
      }

      return matchesSearch && matchesType && matchesPaymentType && matchesDate;
    });

    // ترتيب من الأحدث إلى الأقدم
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [transactions, searchQuery, filterType, filterPaymentType, fromDate, toDate]);

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(null);
    openTransactionModal(transaction);
  };

  const handleDelete = async () => {
    if (!deleteTransactionState) return;

    setIsDeleting(true);
    try {
      const result = await deleteTransaction(deleteTransactionState.id);

      if (result.success) {
        setDeleteTransaction(null);
        setSelectedTransaction(null);
        toast({
          title: 'تم الحذف',
          description: 'تم حذف الحركة بنجاح',
        });
      } else {
        toast({
          title: 'خطأ',
          description: result.error || 'حدث خطأ أثناء الحذف',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الحركة',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <ArrowLeftRight className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الحركات</h1>
            <p className="text-sm text-muted-foreground">{transactions.length} حركة</p>
          </div>
        </div>
        <Button
          onClick={() => openTransactionModal()}
          className="gap-2 rounded-full"
        >
          <Plus className="w-4 h-4" />
          إضافة
        </Button>
      </motion.div>
      
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <div className="flex gap-3">
          <Select
            value={filterType}
            onValueChange={(value: 'all' | 'INCOME' | 'EXPENSE') => setFilterType(value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="نوع الحركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="INCOME">لنا</SelectItem>
              <SelectItem value="EXPENSE">علينا</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filterPaymentType}
            onValueChange={(value: 'all' | 'CASH' | 'DEFERRED' | 'INCOMPLETE') => setFilterPaymentType(value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="نوع الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="CASH">كاش</SelectItem>
              <SelectItem value="DEFERRED">آجل</SelectItem>
              <SelectItem value="INCOMPLETE">غير مكتملة</SelectItem>
            </SelectContent>
          </Select>
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
      
      {/* 🔸 الحركات غير المكتملة - تظهر مع باقي الحركات في نفس القائمة */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-muted/30">
          <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterType !== 'all' || filterPaymentType !== 'all' || hasDateFilter
              ? 'لا توجد نتائج' 
              : 'لا توجد حركات'}
          </p>
          {!searchQuery && filterType === 'all' && filterPaymentType === 'all' && !hasDateFilter && (
            <Button onClick={() => openTransactionModal()}>
              إضافة حركة جديدة
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTransactions.map((transaction, index) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                index={index}
                onClick={() => setSelectedTransaction(transaction)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {/* Transaction Modal */}
      <TransactionModal />
      
      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل الحركة</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <TransactionDetailContent 
              transaction={selectedTransaction}
              onEdit={() => handleEdit(selectedTransaction)}
              onDelete={() => setDeleteTransaction(selectedTransaction)}
              onComplete={() => {
                setSelectedTransaction(null);
                openTransactionModal(selectedTransaction);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTransactionState} onOpenChange={() => setDeleteTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحركة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الحركة؟
              <br />
              المبلغ: {formatNumber(deleteTransactionState?.finalBalance || 0)} {deleteTransactionState?.currency?.symbol}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Transaction Detail Content Component
function TransactionDetailContent({ 
  transaction, 
  onEdit, 
  onDelete,
  onComplete
}: { 
  transaction: Transaction; 
  onEdit: () => void; 
  onDelete: () => void;
  onComplete?: () => void;
}) {
  const isIncome = transaction.type === 'INCOME';
  const isCash = transaction.paymentType === 'CASH';
  const isFeesIncome = transaction.feesDirection === 'INCOME';
  const isIncomplete = !transaction.isComplete;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={cn(
        'rounded-xl p-4',
        isIncomplete
          ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 border-dashed'
          : isIncome ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            isIncomplete
              ? 'bg-amber-100 dark:bg-amber-900/50'
              : isIncome ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'
          )}>
            {isIncomplete ? (
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            ) : (
              <span className="text-xl font-bold">{transaction.currency?.symbol}</span>
            )}
          </div>
          <div className="flex-1">
            {/* 🔸 شارة غير مكتملة */}
            {isIncomplete && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 font-medium inline-flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                حركة غير مكتملة
              </span>
            )}
            <p className={cn(
              'text-2xl font-bold',
              isIncomplete && 'opacity-60'
            )}>
              {formatNumber(transaction.finalBalance)} {transaction.currency?.symbol}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'text-sm font-medium',
                isIncome ? 'text-emerald-600' : 'text-red-600'
              )}>
                {isIncome ? 'لنا' : 'علينا'}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className={cn(
                'text-sm font-medium',
                isCash ? 'text-blue-600' : 'text-amber-600'
              )}>
                {isCash ? 'كاش' : 'آجل'}
              </span>
            </div>
            {/* 🔸 بيانات ناقصة */}
            {isIncomplete && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">بيانات ناقصة:</p>
                <div className="flex flex-wrap gap-1">
                  {!transaction.amount && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">المبلغ الأساسي</span>
                  )}
                  {(!transaction.conversionFactor || transaction.conversionFactor === 0 || transaction.conversionFactor === 1) && transaction.baseCurrencyId && transaction.baseCurrencyId !== transaction.currencyId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">معامل التحويل</span>
                  )}
                  {(!transaction.finalBalance || transaction.finalBalance === 0) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">الرصيد النهائي</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailItem label="الحساب" value={transaction.account?.name || '-'} />
        <DetailItem label="العملة" value={transaction.currency?.name || '-'} />
        <DetailItem label="المبلغ الأساسي" value={`${formatNumber(transaction.amount)} ${transaction.currency?.symbol}`} />
        <DetailItem label="التاريخ" value={formatDate(transaction.date)} />
        
        {transaction.feesAmount > 0 && (
          <>
            <DetailItem label="قيمة الأجور" value={formatNumber(transaction.feesAmount)} />
            <DetailItem 
              label="اتجاه الأجور" 
              value={isFeesIncome ? 'لنا' : 'علينا'}
              highlight
              highlightColor={isFeesIncome ? 'emerald' : 'red'}
            />
          </>
        )}
      </div>
      
      {/* Description */}
      {transaction.description && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">البيان</p>
          <p className="text-sm">{transaction.description}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      {isIncomplete ? (
        <div className="space-y-3 pt-2">
          {/* 🔸 زر إكمال الحركة غير المكتملة */}
          <Button
            onClick={onComplete || onEdit}
            className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <CheckCircle2 className="w-5 h-5" />
            إكمال الحركة
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onEdit}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              تعديل
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            حذف
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailItem({ 
  label, 
  value, 
  highlight = false,
  highlightColor = 'primary'
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  highlightColor?: 'primary' | 'emerald' | 'red' | 'blue' | 'amber';
}) {
  const highlightClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  
  return (
    <div className={cn(
      'rounded-lg p-3',
      highlight ? highlightClasses[highlightColor] : 'bg-muted/50'
    )}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
