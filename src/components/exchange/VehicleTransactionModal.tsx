'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  X, 
  Calendar,
  DollarSign,
  FileText,
  User,
  CreditCard
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

interface VehicleTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    name: string;
  } | null;
  firstPartnerName: string;
  secondPartnerName: string;
}

export function VehicleTransactionModal({
  isOpen,
  onClose,
  vehicle,
  firstPartnerName,
  secondPartnerName,
}: VehicleTransactionModalProps) {
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [partner, setPartner] = useState<'first' | 'second'>('first');
  const [paymentType, setPaymentType] = useState<'cash' | 'deferred'>('cash');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    // No accounting logic yet - just close
    // Will be implemented later
    onClose();
    
    // Reset form
    setAmount('');
    setDescription('');
    setPartner('first');
    setPaymentType('cash');
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setAmount('');
    setDescription('');
    setPartner('first');
    setPaymentType('cash');
  };

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-gradient-to-l from-cyan-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Plus className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">إضافة بند جديد</DialogTitle>
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
            <Select value={partner} onValueChange={(v) => setPartner(v as 'first' | 'second')}>
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

          {/* Payment Type */}
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
            >
              حفظ البند
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
