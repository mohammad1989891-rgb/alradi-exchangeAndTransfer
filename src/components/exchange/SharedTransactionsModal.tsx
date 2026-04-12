'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  X, 
  Plus, 
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Shared Transaction type
interface SharedTransaction {
  id: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
  createdAt: Date;
}

interface SharedTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  firstPartnerName: string;
  secondPartnerName: string;
  firstPartnerTotal: number;
  secondPartnerTotal: number;
  totalBalance: number;
  // 🆕 Props للتحكم من الخارج
  transactions: SharedTransaction[];
  onAddTransaction: (data: Omit<SharedTransaction, 'id' | 'createdAt'>) => void;
  onUpdateTransaction: (transaction: SharedTransaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export function SharedTransactionsModal({
  isOpen,
  onClose,
  firstPartnerName,
  secondPartnerName,
  firstPartnerTotal,
  secondPartnerTotal,
  totalBalance,
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}: SharedTransactionsModalProps) {
  const { toast } = useToast();
  
  // State for add transaction form
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [partner, setPartner] = useState<'first' | 'second'>('first');
  const [paymentType, setPaymentType] = useState<'cash' | 'deferred'>('cash');
  const [description, setDescription] = useState('');
  
  // State for edit transaction
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPartner, setEditPartner] = useState<'first' | 'second'>('first');
  const [editPaymentType, setEditPaymentType] = useState<'cash' | 'deferred'>('cash');
  const [editDescription, setEditDescription] = useState('');
  
  // State for delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<SharedTransaction | null>(null);

  // Handle add transaction
  const handleAddTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    // استدعاء callback من props
    onAddTransaction({
      date: new Date(date),
      amount: parseFloat(amount),
      partner,
      paymentType,
      description: description || 'بند عام',
    });
    
    // Reset form
    setAmount('');
    setDescription('');
    setPartner('first');
    setPaymentType('cash');
    setShowAddForm(false);
  };

  // Cancel add form
  const handleCancelAdd = () => {
    setAmount('');
    setDescription('');
    setPartner('first');
    setPaymentType('cash');
    setShowAddForm(false);
  };
  
  // ============================================
  // 🔹 تعديل البنود
  // ============================================
  
  // Start editing transaction
  const handleStartEdit = (tx: SharedTransaction) => {
    setEditingTransactionId(tx.id);
    setEditDate(new Date(tx.date).toISOString().split('T')[0]);
    setEditAmount(tx.amount.toString());
    setEditPartner(tx.partner);
    setEditPaymentType(tx.paymentType);
    setEditDescription(tx.description);
  };
  
  // Save edited transaction
  const handleSaveEdit = () => {
    if (!editAmount || parseFloat(editAmount) <= 0 || !editingTransactionId) return;
    
    // إيجاد المعاملة الأصلية للحصول على id و createdAt
    const originalTx = transactions.find(t => t.id === editingTransactionId);
    if (!originalTx) return;
    
    // استدعاء callback من props
    onUpdateTransaction({
      id: editingTransactionId,
      date: new Date(editDate),
      amount: parseFloat(editAmount),
      partner: editPartner,
      paymentType: editPaymentType,
      description: editDescription || 'بند عام',
      createdAt: originalTx.createdAt,
    });
    
    setEditingTransactionId(null);
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTransactionId(null);
  };
  
  // ============================================
  // 🔹 حذف البنود
  // ============================================
  
  // Request delete transaction
  const handleRequestDelete = (tx: SharedTransaction) => {
    setTransactionToDelete(tx);
    setShowDeleteDialog(true);
  };
  
  // Confirm delete transaction
  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      // استدعاء callback من props
      onDeleteTransaction(transactionToDelete.id);
    }
    setShowDeleteDialog(false);
    setTransactionToDelete(null);
  };
  
  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setTransactionToDelete(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-gradient-to-l from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">البنود العامة</DialogTitle>
                <p className="text-xs text-muted-foreground">مصاريف مشتركة</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="p-4 bg-muted/30 border-b border-border">
          {/* Total Balance */}
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 mb-3">
            <p className="text-xs text-muted-foreground mb-1">إجمالي الرصيد</p>
            <p className={cn(
              "text-2xl font-bold",
              totalBalance >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {totalBalance.toLocaleString('ar-SA')}
            </p>
            <div className={cn(
              "inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium",
              totalBalance >= 0 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {totalBalance >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  <span>لنا</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3" />
                  <span>علينا</span>
                </>
              )}
            </div>
          </div>

          {/* Partners Totals */}
          <div className="grid grid-cols-2 gap-3">
            {/* First Partner */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">{firstPartnerName}</span>
              </div>
              <p className="text-lg font-bold text-emerald-500">
                {firstPartnerTotal.toLocaleString('ar-SA')}
              </p>
            </div>

            {/* Second Partner */}
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] text-muted-foreground">{secondPartnerName}</span>
              </div>
              <p className="text-lg font-bold text-orange-500">
                {secondPartnerTotal.toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        </div>

        {/* Add Transaction Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border bg-muted/20 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      التاريخ
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      المبلغ
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Partner Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <User className="w-3 h-3" />
                    الشريك
                  </Label>
                  <Select value={partner} onValueChange={(v) => setPartner(v as 'first' | 'second')}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          {firstPartnerName}
                        </div>
                      </SelectItem>
                      <SelectItem value="second">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          {secondPartnerName}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    نوع الدفع
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={paymentType === 'cash' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-9",
                        paymentType === 'cash' && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                      onClick={() => setPaymentType('cash')}
                    >
                      كاش
                    </Button>
                    <Button
                      type="button"
                      variant={paymentType === 'deferred' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-9",
                        paymentType === 'deferred' && "bg-orange-500 hover:bg-orange-600"
                      )}
                      onClick={() => setPaymentType('deferred')}
                    >
                      آجل
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    البيان
                  </Label>
                  <Input
                    placeholder="وصف البند"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Form Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAdd}
                    className="h-9"
                  >
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddTransaction}
                    className="h-9 bg-primary hover:bg-primary/90"
                    disabled={!amount || parseFloat(amount) <= 0}
                  >
                    حفظ
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions List */}
        <ScrollArea className="flex-1 h-[250px]">
          <div className="p-4">
            {transactions.length === 0 ? (
              /* Empty State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-3">
                  <FileText className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">لا توجد بنود عامة</p>
                <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة بند" لبدء الإضافة</p>
              </div>
            ) : (
              /* Transactions List */
              <div className="space-y-2">
                <AnimatePresence>
                  {transactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-3 rounded-xl border",
                        tx.partner === 'first' 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : "bg-orange-500/5 border-orange-500/20"
                      )}
                    >
                      {editingTransactionId === tx.id ? (
                        /* Edit Form */
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="h-8 text-xs"
                            placeholder="البيان"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={editPartner} onValueChange={(v) => setEditPartner(v as 'first' | 'second')}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="first">{firstPartnerName}</SelectItem>
                                <SelectItem value="second">{secondPartnerName}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={editPaymentType} onValueChange={(v) => setEditPaymentType(v as 'cash' | 'deferred')}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">كاش</SelectItem>
                                <SelectItem value="deferred">آجل</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelEdit}>
                              إلغاء
                            </Button>
                            <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={handleSaveEdit}>
                              <Check className="w-3 h-3 mr-1" />
                              حفظ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-foreground text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(tx.date).toLocaleDateString('ar-SA')}
                              {' • '}
                              <span className={tx.paymentType === 'cash' ? 'text-emerald-500' : 'text-orange-500'}>
                                {tx.paymentType === 'cash' ? 'كاش' : 'آجل'}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-left">
                              <p className={cn(
                                "font-bold",
                                tx.partner === 'first' ? 'text-emerald-500' : 'text-orange-500'
                              )}>
                                {tx.amount.toLocaleString('ar-SA')}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {tx.partner === 'first' ? firstPartnerName : secondPartnerName}
                              </p>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 mr-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleStartEdit(tx)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                onClick={() => handleRequestDelete(tx)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Add Button */}
        <div className="p-4 border-t border-border bg-background">
          <Button
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة بند عام</span>
          </Button>
        </div>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              حذف البند
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل أنت متأكد من حذف هذا البند؟</span>
              <span className="block text-xs text-muted-foreground mt-2">
                "{transactionToDelete?.description}" - {transactionToDelete?.amount.toLocaleString('ar-SA')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
