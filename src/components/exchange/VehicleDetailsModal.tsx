'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  X, 
  Plus, 
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  } | null;
  firstPartnerName: string;
  secondPartnerName: string;
}

export function VehicleDetailsModal({
  isOpen,
  onClose,
  onAddTransaction,
  vehicle,
  firstPartnerName,
  secondPartnerName,
}: VehicleDetailsModalProps) {
  if (!vehicle) return null;

  const handleAddTransaction = () => {
    onClose();
    onAddTransaction();
  };

  return (
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
                {vehicle.firstPartnerTotal.toLocaleString('ar-SA')}
              </p>
            </div>

            {/* Second Partner */}
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] text-muted-foreground">{secondPartnerName}</span>
              </div>
              <p className="text-lg font-bold text-orange-500">
                {vehicle.secondPartnerTotal.toLocaleString('ar-SA')}
              </p>
            </div>

            {/* Total Cost */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">الإجمالي</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {vehicle.totalCost.toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <ScrollArea className="flex-1 h-[300px]">
          <div className="p-4">
            {/* Empty State */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-3">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">لا توجد بنود</p>
              <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة بند" لبدء الإضافة</p>
            </div>
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
  );
}
