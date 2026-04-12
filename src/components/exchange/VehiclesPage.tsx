'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Plus, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Scale,
  Edit2,
  Check,
  X,
  Truck,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { VehicleDetailsModal, VehicleTransaction } from './VehicleDetailsModal';
import { VehicleTransactionModal } from './VehicleTransactionModal';
import { SharedTransactionsModal } from './SharedTransactionsModal';
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
import * as db from '@/lib/localDb';

// Vehicle type for local state
interface VehicleCard {
  id: string;
  name: string;
  firstPartnerTotal: number;
  secondPartnerTotal: number;
  totalCost: number;
  createdAt: Date;
  transactions: VehicleTransaction[];
}

// Shared Transaction type - البنود العامة
interface SharedTransaction {
  id: string;
  date: Date;
  amount: number;
  partner: 'first' | 'second';
  paymentType: 'cash' | 'deferred';
  description: string;
  createdAt: Date;
}

export function VehiclesPage() {
  const { toast } = useToast();
  
  // State for partner names (editable)
  const [firstPartnerName, setFirstPartnerName] = useState('الشريك الأول');
  const [secondPartnerName, setSecondPartnerName] = useState('الشريك الثاني');
  const [isEditingFirstPartner, setIsEditingFirstPartner] = useState(false);
  const [isEditingSecondPartner, setIsEditingSecondPartner] = useState(false);
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempSecondName, setTempSecondName] = useState('');

  // State for vehicles list
  const [vehicles, setVehicles] = useState<VehicleCard[]>([]);
  
  // State for shared transactions - البنود العامة
  const [sharedTransactions, setSharedTransactions] = useState<SharedTransaction[]>([]);

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCard | null>(null);
  
  // Delete confirmation states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleCard | null>(null);
  
  // Edit vehicle name states
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingVehicleName, setEditingVehicleName] = useState('');

  // ============================================
  // 🔹 حسابات تلقائية للبطاقة الرئيسية
  // 🔹 المعادلة: إجمالي الرصيد = الشريك الأول - الشريك الثاني
  // 🔹 موجب = لنا | سالب = علينا
  // 🔹 تشمل: معاملات المركبات + البنود العامة
  // ============================================
  const calculatedTotals = useMemo(() => {
    // إجمالي معاملات المركبات
    const vehiclesFirstTotal = vehicles.reduce((sum, v) => sum + v.firstPartnerTotal, 0);
    const vehiclesSecondTotal = vehicles.reduce((sum, v) => sum + v.secondPartnerTotal, 0);
    
    // إجمالي البنود العامة
    const sharedFirstTotal = sharedTransactions
      .filter(t => t.partner === 'first')
      .reduce((sum, t) => sum + t.amount, 0);
    const sharedSecondTotal = sharedTransactions
      .filter(t => t.partner === 'second')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // الإجمالي الكلي
    const firstPartnerTotal = vehiclesFirstTotal + sharedFirstTotal;
    const secondPartnerTotal = vehiclesSecondTotal + sharedSecondTotal;
    const totalBalance = firstPartnerTotal - secondPartnerTotal; // الشريك الأول - الشريك الثاني
    
    return { firstPartnerTotal, secondPartnerTotal, totalBalance };
  }, [vehicles, sharedTransactions]);

  const { totalBalance, firstPartnerTotal, secondPartnerTotal } = calculatedTotals;

  // Generate unique ID
  const generateId = () => 'vehicle_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

  // ============================================
  // 🔹 حسابات المركبة الواحدة
  // ============================================
  const calculateVehicleTotals = useCallback((transactions: VehicleTransaction[]) => {
    const firstPartnerTotal = transactions
      .filter(t => t.partner === 'first')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const secondPartnerTotal = transactions
      .filter(t => t.partner === 'second')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { firstPartnerTotal, secondPartnerTotal };
  }, []);

  // Add new vehicle handler
  const handleAddVehicle = () => {
    const newVehicle: VehicleCard = {
      id: generateId(),
      name: `مركبة ${vehicles.length + 1}`,
      firstPartnerTotal: 0,
      secondPartnerTotal: 0,
      totalCost: 0,
      createdAt: new Date(),
      transactions: [],
    };
    setVehicles([...vehicles, newVehicle]);
  };

  // Open vehicle details
  const handleVehicleClick = (vehicle: VehicleCard) => {
    setSelectedVehicle(vehicle);
    setIsDetailsModalOpen(true);
  };

  // Open transaction modal from details modal
  const handleOpenTransactionModal = () => {
    setIsTransactionModalOpen(true);
  };

  // Close all modals
  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
  };

  // Open shared transactions modal
  const handleOpenSharedModal = () => {
    setIsSharedModalOpen(true);
  };

  // Close shared transactions modal
  const handleCloseSharedModal = () => {
    setIsSharedModalOpen(false);
  };

  // ============================================
  // 🔹 إضافة/تعديل/حذف المعاملات
  // ============================================
  
  // إضافة معاملة جديدة
  const handleAddTransaction = async (data: Omit<VehicleTransaction, 'id' | 'vehicleId' | 'createdAt'>) => {
    if (!selectedVehicle) return;
    
    const newTransaction: VehicleTransaction = {
      id: generateId(),
      vehicleId: selectedVehicle.id,
      date: data.date,
      amount: data.amount,
      partner: data.partner,
      paymentType: data.paymentType,
      description: data.description,
      createdAt: new Date(),
    };
    
    // تحديث المركبة بالمعاملة الجديدة
    setVehicles(vehicles.map(v => {
      if (v.id === selectedVehicle.id) {
        const newTransactions = [...v.transactions, newTransaction];
        const totals = calculateVehicleTotals(newTransactions);
        return {
          ...v,
          transactions: newTransactions,
          ...totals,
        };
      }
      return v;
    }));
    
    // تحديث المركبة المحددة
    setSelectedVehicle(prev => {
      if (!prev) return null;
      const newTransactions = [...prev.transactions, newTransaction];
      const totals = calculateVehicleTotals(newTransactions);
      return {
        ...prev,
        transactions: newTransactions,
        ...totals,
      };
    });
    
    // تحديث الصندوق للمعاملات الكاش
    if (data.paymentType === 'cash') {
      await updateCashbox(data.amount, data.partner, true);
    }
    
    toast({
      title: 'تمت الإضافة',
      description: 'تم إضافة البند بنجاح',
    });
  };
  
  // تعديل معاملة
  const handleUpdateTransaction = async (updatedTransaction: VehicleTransaction) => {
    if (!selectedVehicle) return;
    
    // إيجاد المعاملة القديمة
    const oldTransaction = selectedVehicle.transactions.find(t => t.id === updatedTransaction.id);
    
    // تحديث المركبة
    setVehicles(vehicles.map(v => {
      if (v.id === selectedVehicle.id) {
        const newTransactions = v.transactions.map(t => 
          t.id === updatedTransaction.id ? updatedTransaction : t
        );
        const totals = calculateVehicleTotals(newTransactions);
        return {
          ...v,
          transactions: newTransactions,
          ...totals,
        };
      }
      return v;
    }));
    
    // تحديث المركبة المحددة
    setSelectedVehicle(prev => {
      if (!prev) return null;
      const newTransactions = prev.transactions.map(t => 
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      const totals = calculateVehicleTotals(newTransactions);
      return {
        ...prev,
        transactions: newTransactions,
        ...totals,
      };
    });
    
    // تحديث الصندوق إذا تغيرت المعاملة
    if (oldTransaction) {
      // عكس تأثير المعاملة القديمة
      if (oldTransaction.paymentType === 'cash') {
        await updateCashbox(oldTransaction.amount, oldTransaction.partner, false);
      }
      // إضافة تأثير المعاملة الجديدة
      if (updatedTransaction.paymentType === 'cash') {
        await updateCashbox(updatedTransaction.amount, updatedTransaction.partner, true);
      }
    }
    
    toast({
      title: 'تم التعديل',
      description: 'تم تعديل البند بنجاح',
    });
  };
  
  // حذف معاملة
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!selectedVehicle) return;
    
    // إيجاد المعاملة قبل الحذف
    const transaction = selectedVehicle.transactions.find(t => t.id === transactionId);
    
    // تحديث المركبة
    setVehicles(vehicles.map(v => {
      if (v.id === selectedVehicle.id) {
        const newTransactions = v.transactions.filter(t => t.id !== transactionId);
        const totals = calculateVehicleTotals(newTransactions);
        return {
          ...v,
          transactions: newTransactions,
          ...totals,
        };
      }
      return v;
    }));
    
    
    // تحديث المركبة المحددة
    setSelectedVehicle(prev => {
      if (!prev) return null;
      const newTransactions = prev.transactions.filter(t => t.id !== transactionId);
      const totals = calculateVehicleTotals(newTransactions);
      return {
        ...prev,
        transactions: newTransactions,
        ...totals,
      };
    });
    
    // عكس تأثير الصندوق للحذف
    if (transaction && transaction.paymentType === 'cash') {
      await updateCashbox(transaction.amount, transaction.partner, false);
    }
    
    toast({
      title: 'تم الحذف',
      description: 'تم حذف البند بنجاح',
    });
  };

  // ============================================
  // 🔹 تعديل وحذف المركبات
  // ============================================
  
  // Start editing vehicle name
  const handleStartEditVehicleName = (e: React.MouseEvent, vehicle: VehicleCard) => {
    e.stopPropagation();
    setEditingVehicleId(vehicle.id);
    setEditingVehicleName(vehicle.name);
  };
  
  // Save vehicle name
  const handleSaveVehicleName = (vehicleId: string) => {
    if (editingVehicleName.trim()) {
      setVehicles(vehicles.map(v => 
        v.id === vehicleId ? { ...v, name: editingVehicleName.trim() } : v
      ));
    }
    setEditingVehicleId(null);
    setEditingVehicleName('');
  };
  
  // Cancel editing vehicle name
  const handleCancelEditVehicleName = () => {
    setEditingVehicleId(null);
    setEditingVehicleName('');
  };
  
  // Request delete vehicle
  const handleRequestDeleteVehicle = (e: React.MouseEvent, vehicle: VehicleCard) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setShowDeleteDialog(true);
  };
  
  // Confirm delete vehicle
  const handleConfirmDeleteVehicle = async () => {
    if (vehicleToDelete) {
      // عكس تأثير جميع المعاملات الكاش قبل الحذف
      for (const tx of vehicleToDelete.transactions) {
        if (tx.paymentType === 'cash') {
          await updateCashbox(tx.amount, tx.partner, false);
        }
      }
      
      // حذف المركبة مع جميع معاملاتها
      setVehicles(vehicles.filter(v => v.id !== vehicleToDelete.id));
      toast({
        title: 'تم الحذف',
        description: `تم حذف "${vehicleToDelete.name}" وجميع معاملاتها`,
      });
    }
    setShowDeleteDialog(false);
    setVehicleToDelete(null);
  };
  
  // Cancel delete vehicle
  const handleCancelDeleteVehicle = () => {
    setShowDeleteDialog(false);
    setVehicleToDelete(null);
  };

  // ============================================
  // 🔹 البنود العامة - إضافة/تعديل/حذف مع تكامل الصندوق
  // 🔸 الشريك الأول (لنا) كاش = خصم من الصندوق
  // 🔸 الشريك الثاني (علينا) كاش = إضافة للصندوق
  // ============================================
  
  // تحديث الصندوق
  const updateCashbox = async (amount: number, partner: 'first' | 'second', isAdd: boolean) => {
    try {
      // الشريك الأول (لنا) = خصم من الصندوق عند الإضافة
      // الشريك الثاني (علينا) = إضافة للصندوق عند الإضافة
      const direction = partner === 'first' ? -1 : 1; // first = خصم, second = إضافة
      const multiplier = isAdd ? direction : -direction; // عكس العملية عند الحذف
      
      const balanceDelta = amount * multiplier;
      await db.updateVaultBalance('cur_usd', balanceDelta);
    } catch (error) {
      console.error('Error updating cashbox:', error);
    }
  };
  
  // إضافة بند عام
  const handleAddSharedTransaction = async (data: Omit<SharedTransaction, 'id' | 'createdAt'>) => {
    const newTransaction: SharedTransaction = {
      id: 'shared_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9),
      date: data.date,
      amount: data.amount,
      partner: data.partner,
      paymentType: data.paymentType,
      description: data.description,
      createdAt: new Date(),
    };
    
    setSharedTransactions([...sharedTransactions, newTransaction]);
    
    // تحديث الصندوق للمعاملات الكاش
    if (data.paymentType === 'cash') {
      await updateCashbox(data.amount, data.partner, true);
    }
    
    toast({
      title: 'تمت الإضافة',
      description: 'تم إضافة البند العام بنجاح',
    });
  };
  
  // تعديل بند عام
  const handleUpdateSharedTransaction = async (updatedTransaction: SharedTransaction) => {
    const oldTransaction = sharedTransactions.find(t => t.id === updatedTransaction.id);
    
    setSharedTransactions(sharedTransactions.map(t => 
      t.id === updatedTransaction.id ? updatedTransaction : t
    ));
    
    // تحديث الصندوق إذا تغيرت المعاملة
    if (oldTransaction) {
      // عكس تأثير المعاملة القديمة
      if (oldTransaction.paymentType === 'cash') {
        await updateCashbox(oldTransaction.amount, oldTransaction.partner, false);
      }
      // إضافة تأثير المعاملة الجديدة
      if (updatedTransaction.paymentType === 'cash') {
        await updateCashbox(updatedTransaction.amount, updatedTransaction.partner, true);
      }
    }
    
    toast({
      title: 'تم التعديل',
      description: 'تم تعديل البند العام بنجاح',
    });
  };
  
  // حذف بند عام
  const handleDeleteSharedTransaction = async (transactionId: string) => {
    const transaction = sharedTransactions.find(t => t.id === transactionId);
    
    setSharedTransactions(sharedTransactions.filter(t => t.id !== transactionId));
    
    // عكس تأثير الصندوق للحذف
    if (transaction && transaction.paymentType === 'cash') {
      await updateCashbox(transaction.amount, transaction.partner, false);
    }
    
    toast({
      title: 'تم الحذف',
      description: 'تم حذف البند العام بنجاح',
    });
  };

  // Edit partner name handlers
  const handleEditFirstPartner = () => {
    setTempFirstName(firstPartnerName);
    setIsEditingFirstPartner(true);
  };

  const handleEditSecondPartner = () => {
    setTempSecondName(secondPartnerName);
    setIsEditingSecondPartner(true);
  };

  const handleSaveFirstPartner = () => {
    if (tempFirstName.trim()) {
      setFirstPartnerName(tempFirstName.trim());
    }
    setIsEditingFirstPartner(false);
  };

  const handleSaveSecondPartner = () => {
    if (tempSecondName.trim()) {
      setSecondPartnerName(tempSecondName.trim());
    }
    setIsEditingSecondPartner(false);
  };

  const handleCancelFirstPartner = () => {
    setIsEditingFirstPartner(false);
  };

  const handleCancelSecondPartner = () => {
    setIsEditingSecondPartner(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">المركبات</h1>
              <p className="text-xs text-muted-foreground">إدارة شراكات المركبات</p>
            </div>
          </div>
          
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={handleAddVehicle}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مركبة</span>
          </Button>
        </div>

        {/* Main Summary Card - Clickable */}
        <Card 
          className="border-2 border-primary/20 shadow-lg cursor-pointer hover:border-primary/50 hover:shadow-xl transition-all"
          onClick={handleOpenSharedModal}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="w-5 h-5 text-primary" />
              ملخص الشراكة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Balance */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">إجمالي الرصيد</p>
              <p className={cn(
                "text-4xl font-bold",
                totalBalance >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {totalBalance.toLocaleString('ar-SA')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
              {/* Status Label: لنا / علينا */}
              <div className={cn(
                "inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium",
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

            {/* Partner Names Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Partner */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">اسم الشريك الأول</Label>
                  {!isEditingFirstPartner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleEditFirstPartner}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {isEditingFirstPartner ? (
                  <div className="flex gap-2">
                    <Input
                      value={tempFirstName}
                      onChange={(e) => setTempFirstName(e.target.value)}
                      className="text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-emerald-500"
                      onClick={handleSaveFirstPartner}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500"
                      onClick={handleCancelFirstPartner}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="font-medium text-foreground">{firstPartnerName}</p>
                  </div>
                )}
              </div>

              {/* Second Partner */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">اسم الشريك الثاني</Label>
                  {!isEditingSecondPartner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleEditSecondPartner}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {isEditingSecondPartner ? (
                  <div className="flex gap-2">
                    <Input
                      value={tempSecondName}
                      onChange={(e) => setTempSecondName(e.target.value)}
                      className="text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-emerald-500"
                      onClick={handleSaveSecondPartner}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500"
                      onClick={handleCancelSecondPartner}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="font-medium text-foreground">{secondPartnerName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Partners Totals */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Partner Total */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">مجموع {firstPartnerName}</span>
                </div>
                <p className="text-2xl font-bold text-emerald-500">
                  {firstPartnerTotal.toLocaleString('ar-SA')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
              </motion.div>

              {/* Second Partner Total */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">مجموع {secondPartnerName}</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {secondPartnerTotal.toLocaleString('ar-SA')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Divider between main card and vehicle cards */}
        {vehicles.length > 0 && (
          <div className="flex items-center gap-4 py-2">
            <Separator className="flex-1" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span className="text-sm font-medium">المركبات ({vehicles.length})</span>
            </div>
            <Separator className="flex-1" />
          </div>
        )}

        {/* Vehicle Cards */}
        <AnimatePresence>
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="border border-border hover:border-cyan-500/50 hover:shadow-lg transition-all"
                onClick={() => editingVehicleId !== vehicle.id && handleVehicleClick(vehicle)}
              >
                <CardContent className="p-4">
                  {/* Vehicle Name with Edit/Delete Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <Truck className="w-5 h-5 text-cyan-500" />
                      </div>
                      {editingVehicleId === vehicle.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingVehicleName}
                            onChange={(e) => setEditingVehicleName(e.target.value)}
                            className="text-sm h-9"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-emerald-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveVehicleName(vehicle.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditVehicleName();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="text-xl font-bold text-foreground">{vehicle.name}</h3>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    {editingVehicleId !== vehicle.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleStartEditVehicleName(e, vehicle)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => handleRequestDeleteVehicle(e, vehicle)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* First Partner Total */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{firstPartnerName}</p>
                      <p className="text-lg font-bold text-emerald-500">
                        {vehicle.firstPartnerTotal.toLocaleString('ar-SA')}
                      </p>
                    </div>

                    {/* Second Partner Total */}
                    <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{secondPartnerName}</p>
                      <p className="text-lg font-bold text-orange-500">
                        {vehicle.secondPartnerTotal.toLocaleString('ar-SA')}
                      </p>
                    </div>

                    {/* Total Cost = First + Second */}
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">التكلفة الإجمالية</p>
                      <p className="text-lg font-bold text-primary">
                        {(vehicle.firstPartnerTotal + vehicle.secondPartnerTotal).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">لا توجد مركبات حالياً</p>
            <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة مركبة" لبدء الإضافة</p>
          </div>
        )}
      </div>

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        onAddTransaction={handleOpenTransactionModal}
        vehicle={selectedVehicle}
        firstPartnerName={firstPartnerName}
        secondPartnerName={secondPartnerName}
        onUpdateTransaction={handleUpdateTransaction}
        onDeleteTransaction={handleDeleteTransaction}
      />

      {/* Vehicle Transaction Modal */}
      <VehicleTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        vehicle={selectedVehicle}
        firstPartnerName={firstPartnerName}
        secondPartnerName={secondPartnerName}
        onSave={handleAddTransaction}
      />

      {/* Shared Transactions Modal */}
      <SharedTransactionsModal
        isOpen={isSharedModalOpen}
        onClose={handleCloseSharedModal}
        firstPartnerName={firstPartnerName}
        secondPartnerName={secondPartnerName}
        firstPartnerTotal={firstPartnerTotal}
        secondPartnerTotal={secondPartnerTotal}
        totalBalance={totalBalance}
        transactions={sharedTransactions}
        onAddTransaction={handleAddSharedTransaction}
        onUpdateTransaction={handleUpdateSharedTransaction}
        onDeleteTransaction={handleDeleteSharedTransaction}
      />

      {/* Delete Vehicle Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              حذف المركبة
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل أنت متأكد من حذف "{vehicleToDelete?.name}"؟</span>
              <span className="block text-xs text-red-500 mt-2">
                ⚠️ سيتم حذف جميع المعاملات المرتبطة بهذه المركبة
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteVehicle}>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteVehicle}
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
