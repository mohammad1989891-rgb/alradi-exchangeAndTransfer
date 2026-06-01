'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Trash2,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { VehicleDetailsModal, VehicleTransaction } from './VehicleDetailsModal';
import { VehicleTransactionModal } from './VehicleTransactionModal';
import { SharedTransactionsModal } from './SharedTransactionsModal';
import { PartnerDetailsModal, PartnerTransactionItem } from './PartnerDetailsModal';
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
import * as db from '@/lib/supabaseDb';

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

// ============================================
// 🔹 دالة تنسيق التاريخ للطباعة
// 🔹 Additive Feature: مساعدة عرض التاريخ
// ============================================
function formatDateForPrint(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ============================================
// 🔹 دالة طباعة تقرير المركبة
// 🔹 Additive Feature: زر الطباعة فقط
// 🔹 لا تغيير للتصميم أو المنطق المحاسبي
// ============================================
function printVehicleReport(
  vehicleName: string,
  firstPartnerName: string,
  secondPartnerName: string,
  firstPartnerTotal: number,
  secondPartnerTotal: number,
  totalCost: number,
  transactions: VehicleTransaction[]
) {
  const totalCostValue = firstPartnerTotal + secondPartnerTotal;
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تقرير ${vehicleName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
          direction: rtl;
          color: #1a1a2e;
          background: #fff;
          padding: 30px 40px;
          max-width: 210mm;
          margin: 0 auto;
        }

        /* Header */
        .report-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 3px solid #0d9488;
        }
        .report-header h1 {
          font-size: 22px;
          font-weight: 800;
          color: #0d9488;
          margin-bottom: 4px;
        }
        .report-header .vehicle-name {
          font-size: 28px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 6px;
        }
        .report-header .date {
          font-size: 13px;
          color: #6b7280;
        }

        /* Summary Cards */
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
        }
        .summary-card {
          border: 2px solid;
          border-radius: 12px;
          padding: 16px 12px;
          text-align: center;
        }
        .summary-card.first {
          border-color: #10b981;
          background: #ecfdf5;
        }
        .summary-card.second {
          border-color: #f97316;
          background: #fff7ed;
        }
        .summary-card.total {
          border-color: #0d9488;
          background: #f0fdfa;
        }
        .summary-card .label {
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 6px;
        }
        .summary-card .value {
          font-size: 26px;
          font-weight: 800;
        }
        .summary-card.first .value { color: #059669; }
        .summary-card.second .value { color: #ea580c; }
        .summary-card.total .value { color: #0d9488; }
        .summary-card .currency {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        /* Table */
        .table-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        thead th {
          background: #0d9488;
          color: #fff;
          padding: 10px 12px;
          font-weight: 600;
          text-align: center;
          font-size: 13px;
        }
        thead th:first-child { border-radius: 0 8px 0 0; }
        thead th:last-child { border-radius: 8px 0 0 0; }
        tbody td {
          padding: 9px 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: center;
        }
        tbody tr:nth-child(even) { background: #f9fafb; }
        tbody tr:hover { background: #f0fdfa; }
        .partner-first { color: #059669; font-weight: 600; }
        .partner-second { color: #ea580c; font-weight: 600; }
        .amount-cell { font-weight: 700; font-family: 'Tajawal', monospace; }
        .payment-cash { 
          background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; 
        }
        .payment-deferred { 
          background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; 
        }

        /* Footer */
        .report-footer {
          margin-top: 28px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
        }

        /* Print settings */
        @media print {
          body { padding: 20px 30px; }
          .summary-grid { gap: 12px; }
          .summary-card .value { font-size: 22px; }
          table { font-size: 12px; }
          thead th { padding: 8px 10px; }
          tbody td { padding: 7px 10px; }
        }

        /* No-print button */
        .no-print {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .no-print button {
          padding: 10px 28px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
        }
        .btn-print {
          background: #0d9488;
          color: #fff;
        }
        .btn-close {
          background: #e5e7eb;
          color: #374151;
        }

        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <!-- Print/Close Buttons -->
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ طباعة التقرير</button>
        <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
      </div>

      <!-- Report Header -->
      <div class="report-header">
        <h1>الراضي للصرافة والحوالات</h1>
        <div class="vehicle-name">🚛 ${vehicleName}</div>
        <div class="date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card first">
          <div class="label">مساهمة ${firstPartnerName}</div>
          <div class="value">${toEnglishNumbers(firstPartnerTotal)}</div>
          <div class="currency">دولار أمريكي</div>
        </div>
        <div class="summary-card second">
          <div class="label">مساهمة ${secondPartnerName}</div>
          <div class="value">${toEnglishNumbers(secondPartnerTotal)}</div>
          <div class="currency">دولار أمريكي</div>
        </div>
        <div class="summary-card total">
          <div class="label">تكلفة المركبة (الإجمالي)</div>
          <div class="value">${toEnglishNumbers(totalCostValue)}</div>
          <div class="currency">دولار أمريكي</div>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="table-title">تفاصيل البنود (${toEnglishNumbers(sortedTransactions.length)} بند)</div>
      ${sortedTransactions.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>التاريخ</th>
            <th>الشريك</th>
            <th>المبلغ</th>
            <th>نوع العملية</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTransactions.map((tx, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${formatDateForPrint(tx.date)}</td>
              <td class="${tx.partner === 'first' ? 'partner-first' : 'partner-second'}">
                ${tx.partner === 'first' ? firstPartnerName : secondPartnerName}
              </td>
              <td class="amount-cell">${toEnglishNumbers(tx.amount)}</td>
              <td>
                <span class="${tx.paymentType === 'cash' ? 'payment-cash' : 'payment-deferred'}">
                  ${tx.paymentType === 'cash' ? 'كاش' : 'آجل'}
                </span>
              </td>
              <td>${tx.description || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : `
      <div style="text-align: center; padding: 40px; color: #9ca3af; font-size: 15px;">
        لا توجد بنود مسجلة لهذه المركبة
      </div>
      `}

      <!-- Footer -->
      <div class="report-footer">
        الراضي للصرافة والحوالات — تقرير مركبة: ${vehicleName}
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
}

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

  // 🆕 State for Add Vehicle Modal
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');

  // 🆕 State for loading
  const [isLoading, setIsLoading] = useState(true);

  // 🆕 State for Partner Details Modal
  const [isPartnerDetailsOpen, setIsPartnerDetailsOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<'first' | 'second'>('first');

  // ============================================
  // 🔹 تحميل البيانات من قاعدة البيانات عند البداية
  // 🔹 Additive Fix: حفظ واسترجاع البيانات
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // تحميل الإعدادات
        const settings = await db.getVehiclesSettings();
        if (settings) {
          setFirstPartnerName(settings.firstPartnerName);
          setSecondPartnerName(settings.secondPartnerName);
        }
        
        // تحميل المركبات
        const vehiclesData = await db.getVehicles();
        const vehiclesWithTransactions = await Promise.all(
          vehiclesData.map(async (v) => {
            const transactions = await db.getVehicleTransactions(v.id);
            return {
              id: v.id,
              name: v.name,
              firstPartnerTotal: 0,
              secondPartnerTotal: 0,
              totalCost: 0,
              createdAt: v.createdAt,
              transactions: transactions.map(t => ({
                id: t.id,
                vehicleId: t.vehicleId,
                date: t.date,
                amount: t.amount,
                partner: t.partner,
                paymentType: t.paymentType,
                description: t.description,
                createdAt: t.createdAt,
              })),
            };
          })
        );
        
        // حساب المجاميع لكل مركبة
        const vehiclesWithTotals = vehiclesWithTransactions.map(v => {
          const firstPartnerTotal = v.transactions
            .filter(t => t.partner === 'first')
            .reduce((sum, t) => sum + t.amount, 0);
          const secondPartnerTotal = v.transactions
            .filter(t => t.partner === 'second')
            .reduce((sum, t) => sum + t.amount, 0);
          return {
            ...v,
            firstPartnerTotal,
            secondPartnerTotal,
            totalCost: firstPartnerTotal + secondPartnerTotal,
          };
        });
        
        setVehicles(vehiclesWithTotals);
        
        // تحميل المعاملات المشتركة
        const sharedData = await db.getSharedTransactions();
        setSharedTransactions(sharedData.map(t => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          partner: t.partner,
          paymentType: t.paymentType,
          description: t.description,
          createdAt: t.createdAt,
        })));
        
      } catch (error) {
        console.error('Error loading vehicles data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // ============================================
  // 🔹 حفظ الإعدادات عند تغيير أسماء الشركاء
  // 🔹 Additive Fix: حفظ في قاعدة البيانات
  // ============================================
  useEffect(() => {
    if (!isLoading) {
      db.saveVehiclesSettings({
        firstPartnerName,
        secondPartnerName,
      });
    }
  }, [firstPartnerName, secondPartnerName, isLoading]);

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

  // ============================================
  // 🔹 إضافة مركبة جديدة عبر Modal
  // 🔹 Additive Fix: UI Enhancement
  // ============================================
  
  // فتح نافذة الإضافة
  const handleOpenAddVehicleModal = () => {
    setNewVehicleName('');
    setShowAddVehicleModal(true);
  };
  
  // حفظ المركبة الجديدة
  const handleSaveNewVehicle = async () => {
    if (!newVehicleName.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم المركبة',
        variant: 'destructive',
      });
      return;
    }
    
    const newVehicle: VehicleCard = {
      id: generateId(),
      name: newVehicleName.trim(),
      firstPartnerTotal: 0,
      secondPartnerTotal: 0,
      totalCost: 0,
      createdAt: new Date(),
      transactions: [],
    };
    
    // حفظ في قاعدة البيانات
    await db.addVehicle({
      id: newVehicle.id,
      name: newVehicle.name,
      plateNumber: '',
      notes: '',
      isActive: true,
    });
    
    setVehicles([...vehicles, newVehicle]);
    setShowAddVehicleModal(false);
    setNewVehicleName('');
    
    toast({
      title: 'تمت الإضافة',
      description: `تم إضافة "${newVehicle.name}" بنجاح`,
    });
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
    
    // حفظ في قاعدة البيانات
    await db.addVehicleTransaction({
      id: newTransaction.id,
      vehicleId: newTransaction.vehicleId,
      date: newTransaction.date,
      amount: newTransaction.amount,
      partner: newTransaction.partner,
      paymentType: newTransaction.paymentType,
      description: newTransaction.description,
    });
    
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
    
    // تحديث في قاعدة البيانات
    await db.updateVehicleTransaction(updatedTransaction.id, {
      date: updatedTransaction.date,
      amount: updatedTransaction.amount,
      partner: updatedTransaction.partner,
      paymentType: updatedTransaction.paymentType,
      description: updatedTransaction.description,
    });
    
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
    
    // حذف من قاعدة البيانات
    await db.deleteVehicleTransaction(transactionId);
    
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
  const handleSaveVehicleName = async (vehicleId: string) => {
    if (editingVehicleName.trim()) {
      setVehicles(vehicles.map(v => 
        v.id === vehicleId ? { ...v, name: editingVehicleName.trim() } : v
      ));
      
      // تحديث في قاعدة البيانات
      await db.updateVehicle(vehicleId, { name: editingVehicleName.trim() });
      
      toast({
        title: 'تم التعديل',
        description: 'تم تحديث اسم المركبة',
      });
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
      
      // حذف المركبة من قاعدة البيانات
      await db.deleteVehicle(vehicleToDelete.id);
      
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
    
    // حفظ في قاعدة البيانات
    await db.addSharedTransaction({
      id: newTransaction.id,
      date: newTransaction.date,
      amount: newTransaction.amount,
      partner: newTransaction.partner,
      paymentType: newTransaction.paymentType,
      description: newTransaction.description,
    });
    
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
    
    // تحديث في قاعدة البيانات
    await db.updateSharedTransaction(updatedTransaction.id, {
      date: updatedTransaction.date,
      amount: updatedTransaction.amount,
      partner: updatedTransaction.partner,
      paymentType: updatedTransaction.paymentType,
      description: updatedTransaction.description,
    });
    
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
    
    // حذف من قاعدة البيانات
    await db.deleteSharedTransaction(transactionId);
    
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

  // ============================================
  // 🔹 تعديل أسماء الشركاء - تحسين UX
  // 🔹 Additive Fix: واجهة أوضح
  // ============================================
  
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
    setTempFirstName('');
  };

  const handleCancelSecondPartner = () => {
    setIsEditingSecondPartner(false);
    setTempSecondName('');
  };

  // ============================================
  // 🔹 فتح نافذة تفاصيل الشريك
  // 🔹 Additive Feature: عرض مساهمات الشريك
  // ============================================
  const handleOpenPartnerDetails = (partnerType: 'first' | 'second') => {
    setSelectedPartner(partnerType);
    setIsPartnerDetailsOpen(true);
  };

  const handleClosePartnerDetails = () => {
    setIsPartnerDetailsOpen(false);
  };

  // ============================================
  // 🔹 حساب بنود الشريك المحدد
  // 🔹 تجمع من: معاملات المركبات + البنود العامة
  // ============================================
  const partnerTransactions = useMemo((): PartnerTransactionItem[] => {
    const items: PartnerTransactionItem[] = [];
    
    // بنود من المركبات
    for (const vehicle of vehicles) {
      for (const tx of vehicle.transactions) {
        if (tx.partner === selectedPartner) {
          items.push({
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            paymentType: tx.paymentType,
            description: tx.description,
            source: 'vehicle',
            vehicleName: vehicle.name,
            vehicleId: vehicle.id,
          });
        }
      }
    }
    
    // بنود عامة
    for (const tx of sharedTransactions) {
      if (tx.partner === selectedPartner) {
        items.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          paymentType: tx.paymentType,
          description: tx.description,
          source: 'shared',
        });
      }
    }
    
    return items;
  }, [vehicles, sharedTransactions, selectedPartner]);

  return (
    <>
      <div className="space-y-4">
        {/* Header with Add Button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">المركبات</h1>
              <p className="text-sm text-muted-foreground">إدارة شراكات المركبات</p>
            </div>
          </div>
          
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={handleOpenAddVehicleModal}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مركبة</span>
          </Button>
        </motion.div>

        {/* 🔹 بطاقتا الشركاء - بديل البطاقة الرئيسية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* بطاقة الشريك الأول */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-emerald-500/20 shadow-md hover:border-emerald-500/40 hover:shadow-lg transition-all cursor-pointer" onClick={() => !isEditingFirstPartner && handleOpenPartnerDetails('first')}>
              <CardContent className="p-3 space-y-3">
                {/* اسم الشريك الأول مع زر التعديل */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    {isEditingFirstPartner ? (
                      <div className="flex gap-1">
                        <Input
                          value={tempFirstName}
                          onChange={(e) => setTempFirstName(e.target.value)}
                          className="text-sm h-8"
                          autoFocus
                          placeholder="اسم الشريك الأول"
                          dir="rtl"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-50"
                          onClick={(e) => { e.stopPropagation(); handleSaveFirstPartner(); }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); handleCancelFirstPartner(); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-foreground">{firstPartnerName}</h3>
                    )}
                  </div>
                  {!isEditingFirstPartner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-emerald-500/10"
                      onClick={(e) => { e.stopPropagation(); handleEditFirstPartner(); }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {/* إجمالي الشريك الأول */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي المبالغ</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {toEnglishNumbers(firstPartnerTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* بطاقة الشريك الثاني */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-orange-500/20 shadow-md hover:border-orange-500/40 hover:shadow-lg transition-all cursor-pointer" onClick={() => !isEditingSecondPartner && handleOpenPartnerDetails('second')}>
              <CardContent className="p-3 space-y-3">
                {/* اسم الشريك الثاني مع زر التعديل */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                    </div>
                    {isEditingSecondPartner ? (
                      <div className="flex gap-1">
                        <Input
                          value={tempSecondName}
                          onChange={(e) => setTempSecondName(e.target.value)}
                          className="text-sm h-8"
                          autoFocus
                          placeholder="اسم الشريك الثاني"
                          dir="rtl"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-50"
                          onClick={(e) => { e.stopPropagation(); handleSaveSecondPartner(); }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); handleCancelSecondPartner(); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-foreground">{secondPartnerName}</h3>
                    )}
                  </div>
                  {!isEditingSecondPartner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-orange-500/10"
                      onClick={(e) => { e.stopPropagation(); handleEditSecondPartner(); }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {/* إجمالي الشريك الثاني */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي المبالغ</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {toEnglishNumbers(secondPartnerTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Divider between main card and vehicle cards */}
        {vehicles.length > 0 && (
          <div className="flex items-center gap-4 py-1">
            <Separator className="flex-1" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span className="text-sm font-medium">المركبات ({toEnglishNumbers(vehicles.length)})</span>
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
                <CardContent className="p-3">
                  {/* Vehicle Name with Edit/Delete Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10">
                        <Truck className="w-4 h-4 text-cyan-500" />
                      </div>
                      {editingVehicleId === vehicle.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingVehicleName}
                            onChange={(e) => setEditingVehicleName(e.target.value)}
                            className="text-sm h-8"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            dir="rtl"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-500"
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
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditVehicleName();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="text-base font-bold text-foreground">{vehicle.name}</h3>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    {editingVehicleId !== vehicle.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                          title="طباعة التقرير"
                          onClick={(e) => {
                            e.stopPropagation();
                            printVehicleReport(
                              vehicle.name,
                              firstPartnerName,
                              secondPartnerName,
                              vehicle.firstPartnerTotal,
                              vehicle.secondPartnerTotal,
                              vehicle.totalCost,
                              vehicle.transactions
                            );
                          }}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleStartEditVehicleName(e, vehicle)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => handleRequestDeleteVehicle(e, vehicle)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* First Partner Total */}
                    <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{firstPartnerName}</p>
                      <p className="text-sm font-bold text-emerald-500">
                        {toEnglishNumbers(vehicle.firstPartnerTotal)}
                      </p>
                    </div>

                    {/* Second Partner Total */}
                    <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/20 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{secondPartnerName}</p>
                      <p className="text-sm font-bold text-orange-500">
                        {toEnglishNumbers(vehicle.secondPartnerTotal)}
                      </p>
                    </div>

                    {/* Total Cost = First + Second */}
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">التكلفة</p>
                      <p className="text-sm font-bold text-primary">
                        {toEnglishNumbers(vehicle.firstPartnerTotal + vehicle.secondPartnerTotal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {vehicles.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">لا توجد مركبات حالياً</p>
            <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة مركبة" لبدء الإضافة</p>
          </div>
        )}
      </div>

      {/* 🆕 Add Vehicle Modal */}
      <Dialog open={showAddVehicleModal} onOpenChange={setShowAddVehicleModal}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Plus className="w-5 h-5 text-cyan-500" />
              </div>
              إضافة مركبة جديدة
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              أدخل اسم المركبة لإضافتها إلى قائمة الشراكات
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label className="text-sm mb-2 block">اسم المركبة</Label>
            <Input
              value={newVehicleName}
              onChange={(e) => setNewVehicleName(e.target.value)}
              placeholder="مثال: سيارة تويوتا كامري"
              className="text-right"
              dir="rtl"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNewVehicle();
                }
              }}
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddVehicleModal(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveNewVehicle}
              disabled={!newVehicleName.trim()}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* 🆕 Partner Details Modal */}
      <PartnerDetailsModal
        isOpen={isPartnerDetailsOpen}
        onClose={handleClosePartnerDetails}
        partnerType={selectedPartner}
        partnerName={selectedPartner === 'first' ? firstPartnerName : secondPartnerName}
        totalAmount={selectedPartner === 'first' ? firstPartnerTotal : secondPartnerTotal}
        transactions={partnerTransactions}
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
