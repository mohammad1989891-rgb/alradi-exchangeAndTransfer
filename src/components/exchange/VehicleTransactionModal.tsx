'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  X, 
  Calendar,
  DollarSign,
  FileText,
  User,
  CreditCard,
  Edit2
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

interface VehicleTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    name: string;
  } | null;
  firstPartnerName: string;
  secondPartnerName: string;
  editTransaction?: VehicleTransaction | null; // للتعديل
  onSave: (transaction: Omit<VehicleTransaction, 'id' | 'vehicleId' | 'createdAt'>) => void;
}

export function VehicleTransactionModal({
  isOpen,
  onClose,
  vehicle,
  firstPartnerName,
  secondPartnerName,
  editTransaction,
  onSave,
}: VehicleTransactionModalProps) {
  // Form state
  // تحديث القيم عند فتح النافذة للتعديل
  // استخدام key pattern لإعادة تعيين النموذج عند تغيير المعرفات
  const editKey = editTransaction ? `${editTransaction.id}-${editTransaction.partner}` : 'new';
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [partner, setPartner] = useState<'first' | 'second'>('first');
  const [paymentType, setPaymentType] = useState<'cash' | 'deferred'>('cash');
  const [description, setDescription] = useState('');
  const [lastEditKey, setLastEditKey] = useState(editKey);

  // تحديث الحقول عند تغيير حالة التعديل
  if (editKey !== lastEditKey) {
    setLastEditKey(editKey);
    if (editTransaction) {
      setDate(new Date(editTransaction.date).toISOString().split('T')[0]);
      setAmount(editTransaction.amount.toString());
      setPartner(editTransaction.partner);
      setPaymentType(editTransaction.partner === 'second' ? 'deferred' : editTransaction.paymentType);
      setDescription(editTransaction.description);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setPartner('first');
      setPaymentType('cash');
      setDescription('');
    }
  }

  // 🔹 عند تغيير الشريك: تعيين نوع الدفع تلقائياً
  // الشريك الثاني → آجل دائماً
  // الشريك الأول → يختار المستخدم
  const handlePartnerChange = (v: string) => {
    const newPartner = v as 'first' | 'second';
    setPartner(newPartner);
    if (newPartner === 'second') {
      setPaymentType('deferred');
    }
  };

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    onSave({
      date: new Date(date),
      amount: parseFloat(amount),
      partner,
      // الشريك الثاني دائماً آجل - لا تأثير على الصندوق
      paymentType: partner === 'second' ? 'deferred' : paymentType,
      description: description || 'بند',
    });
    
    // Reset form
    setAmount('');
    setDescription('');
    setPartner('first');
    setPaymentType('cash');
    onClose();
  };

  const handleClose = () => {
    // Reset form
    setAmount('');
    setDescription('');
    setPartner('first');
    setPaymentType('cash');
    onClose();
  };

  if (!vehicle) return null;

  const isEditMode = !!editTransaction;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-gradient-to-l from-cyan-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                {isEditMode ? (
                  <Edit2 className="w-5 h-5 text-cyan-500" />
                ) : (
                  <Plus className="w-5 h-5 text-cyan-500" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {isEditMode ? 'تعديل البند' : 'إضافة بند جديد'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{vehicle.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              التاريخ
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-right"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              المبلغ
            </Label>
            <Input
              type="number"
              placeholder="أدخل المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-right"
            />
          </div>

          {/* Partner Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              الشريك
            </Label>
            <Select value={partner} onValueChange={handlePartnerChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الشريك" />
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

          {/* Payment Type - يظهر فقط للشريك الأول */}
          {partner === 'first' && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              نوع الدفع
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentType === 'cash' ? 'default' : 'outline'}
                className={cn(
                  "h-12",
                  paymentType === 'cash' && "bg-emerald-500 hover:bg-emerald-600"
                )}
                onClick={() => setPaymentType('cash')}
              >
                <span>كاش</span>
              </Button>
              <Button
                type="button"
                variant={paymentType === 'deferred' ? 'default' : 'outline'}
                className={cn(
                  "h-12",
                  paymentType === 'deferred' && "bg-orange-500 hover:bg-orange-600"
                )}
                onClick={() => setPaymentType('deferred')}
              >
                <span>آجل</span>
              </Button>
            </div>
          </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              البيان
            </Label>
            <Input
              placeholder="وصف البند"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-right"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-12"
            >
              إلغاء
            </Button>
            <Button
              className="h-12 bg-cyan-500 hover:bg-cyan-600"
              onClick={handleSave}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              {isEditMode ? 'حفظ التعديل' : 'حفظ البند'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
