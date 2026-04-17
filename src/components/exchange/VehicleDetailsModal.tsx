'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  X, 
  Plus, 
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit2,
  Trash2,
  Check,
  Calendar,
  User,
  CreditCard
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ============================================
// 🔹 دالة تحويل الأرقام العربية إلى إنجليزية
// 🔹 Additive Fix: لا تغيير للمنطق المحاسبي
// ============================================
function toEnglishNumbers(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let str = typeof num === 'number' ? num.toString() : num;
  
  // تحويل الأرقام العربية إلى إنجليزية
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(arabicNumerals[i], 'g'), i.toString());
  }
  
  // تنسيق الرقم مع فواصل
  if (typeof num === 'number') {
    return num.toLocaleString('en-US');
  }
  return str;
}

// Vehicle Transaction type
export interface VehicleTransaction {
  id: string;
  vehicleId: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
  createdAt: Date;
}

interface VehicleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: () => void;
  vehicle: {
    id: string;
    name: string;
    firstPartnerTotal: number;
    secondPartnerTotal: number;
    totalCost: number;
    transactions: VehicleTransaction[];
  } | null;
  firstPartnerName: string;
  secondPartnerName: string;
  onUpdateTransaction: (transaction: VehicleTransaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export function VehicleDetailsModal({
  isOpen,
  onClose,
  onAddTransaction,
  vehicle,
  firstPartnerName,
  secondPartnerName,
  onUpdateTransaction,
  onDeleteTransaction,
}: VehicleDetailsModalProps) {
  const { toast } = useToast();
  
  // State for edit transaction
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPartner, setEditPartner] = useState<'first' | 'second'>('first');
  const [editPaymentType, setEditPaymentType] = useState<'cash' | 'deferred'>('cash');
  const [editDescription, setEditDescription] = useState('');
  
  // State for delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<VehicleTransaction | null>(null);

  if (!vehicle) return null;

  const handleAddTransaction = () => {
    onClose();
    onAddTransaction();
  };

  // ============================================
  // 🔹 تعديل المعاملات
  // ============================================
  
  // Start editing transaction
  const handleStartEdit = (tx: VehicleTransaction) => {
    setEditingTransactionId(tx.id);
    setEditDate(new Date(tx.date).toISOString().split('T')[0]);
    setEditAmount(tx.amount.toString());
    setEditPartner(tx.partner);
    setEditPaymentType(tx.paymentType);
    setEditDescription(tx.description);
  };
  
  // Save edited transaction
  const handleSaveEdit = () => {
    if (!editAmount || parseFloat(editAmount) <= 0) return;
    
    const updatedTransaction: VehicleTransaction = {
      id: editingTransactionId!,
      vehicleId: vehicle.id,
      date: new Date(editDate),
      amount: parseFloat(editAmount),
      partner: editPartner,
      paymentType: editPaymentType,
      description: editDescription || 'بند',
      createdAt: new Date(),
    };
    
    onUpdateTransaction(updatedTransaction);
    setEditingTransactionId(null);
    
    toast({
      title: 'تم التعديل',
      description: 'تم تعديل البند بنجاح',
    });
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTransactionId(null);
  };
  
  // ============================================
  // 🔹 حذف المعاملات
  // ============================================
  
  // Request delete transaction
  const handleRequestDelete = (tx: VehicleTransaction) => {
    setTransactionToDelete(tx);
    setShowDeleteDialog(true);
  };
  
  // Confirm delete transaction
  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete.id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف البند بنجاح',
      });
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-border bg-gradient-to-l from-cyan-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Truck className="w-5 h-5 text-cyan-500" />
                </div>
                <DialogTitle className="text-xl font-bold">{vehicle.name}</DialogTitle>
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
            <div className="grid grid-cols-3 gap-3">
              {/* First Partner */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">{firstPartnerName}</span>
                </div>
                <p className="text-lg font-bold text-emerald-500">
                  {toEnglishNumbers(vehicle.firstPartnerTotal)}
                </p>
              </div>

              {/* Second Partner */}
              <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] text-muted-foreground">{secondPartnerName}</span>
                </div>
                <p className="text-lg font-bold text-orange-500">
                  {toEnglishNumbers(vehicle.secondPartnerTotal)}
                </p>
              </div>

              {/* Total Cost = First + Second */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">الإجمالي</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  {toEnglishNumbers(vehicle.firstPartnerTotal + vehicle.secondPartnerTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <ScrollArea className="flex-1 h-[300px]">
            <div className="p-4">
              {vehicle.transactions.length === 0 ? (
                /* Empty State */
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-3">
                    <FileText className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">لا توجد بنود</p>
                  <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة بند" لبدء الإضافة</p>
                </div>
              ) : (
                /* Transactions List */
                <div className="space-y-2">
                  <AnimatePresence>
                    {vehicle.transactions.map((tx, index) => (
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
                              <div className="space-y-1">
                                <Label className="text-[10px]">التاريخ</Label>
                                <Input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">المبلغ</Label>
                                <Input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">البيان</Label>
                              <Input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="h-8 text-xs"
                                placeholder="البيان"
                              />
                            </div>
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
                                {new Date(tx.date).toLocaleDateString('en-US')}
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
                                  {toEnglishNumbers(tx.amount)}
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
              className="w-full gap-2 bg-cyan-500 hover:bg-cyan-600"
              onClick={handleAddTransaction}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بند جديد</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                "{transactionToDelete?.description}" - {transactionToDelete ? toEnglishNumbers(transactionToDelete.amount) : ''}
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
    </>
  );
}
