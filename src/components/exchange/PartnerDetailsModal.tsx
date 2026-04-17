'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Calendar,
  CreditCard
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

// نوع البند الموحد (من مركبة أو بند عام)
export interface PartnerTransactionItem {
  id: string;
  date: Date;
  amount: number;
  paymentType: 'cash' | 'deferred';
  description: string;
  source: 'vehicle' | 'shared';  // مصدر البند: مركبة أو بند عام
  vehicleName?: string;           // اسم المركبة (إذا كان المصدر مركبة)
  vehicleId?: string;             // معرف المركبة
}

interface PartnerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerType: 'first' | 'second';
  partnerName: string;
  totalAmount: number;
  transactions: PartnerTransactionItem[];
}

export function PartnerDetailsModal({
  isOpen,
  onClose,
  partnerType,
  partnerName,
  totalAmount,
  transactions,
}: PartnerDetailsModalProps) {
  // ألوان حسب الشريك
  const isPartnerFirst = partnerType === 'first';
  const accentColor = isPartnerFirst ? 'emerald' : 'orange';
  const IconComponent = isPartnerFirst ? TrendingUp : TrendingDown;

  // حسابات ملخصة
  const summary = useMemo(() => {
    const cashTotal = transactions
      .filter(t => t.paymentType === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);
    const deferredTotal = transactions
      .filter(t => t.paymentType === 'deferred')
      .reduce((sum, t) => sum + t.amount, 0);
    const vehicleTransactions = transactions.filter(t => t.source === 'vehicle');
    const sharedTransactions = transactions.filter(t => t.source === 'shared');
    return { cashTotal, deferredTotal, vehicleCount: vehicleTransactions.length, sharedCount: sharedTransactions.length };
  }, [transactions]);

  // ترتيب البنود بالتاريخ (الأحدث أولاً)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className={`p-4 border-b border-border bg-gradient-to-l ${isPartnerFirst ? 'from-emerald-500/10 to-transparent' : 'from-orange-500/10 to-transparent'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPartnerFirst ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                <IconComponent className={`w-5 h-5 ${isPartnerFirst ? 'text-emerald-500' : 'text-orange-500'}`} />
              </div>
              <DialogTitle className="text-xl font-bold">{partnerName}</DialogTitle>
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
            {/* الإجمالي */}
            <div className={`p-3 rounded-xl ${isPartnerFirst ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-orange-500/5 border border-orange-500/20'} text-center`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className={`w-3 h-3 ${isPartnerFirst ? 'text-emerald-500' : 'text-orange-500'}`} />
                <span className="text-[10px] text-muted-foreground">الإجمالي</span>
              </div>
              <p className={`text-lg font-bold ${isPartnerFirst ? 'text-emerald-500' : 'text-orange-500'}`}>
                {toEnglishNumbers(totalAmount)}
              </p>
            </div>

            {/* كاش */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CreditCard className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">كاش</span>
              </div>
              <p className="text-lg font-bold text-emerald-500">
                {toEnglishNumbers(summary.cashTotal)}
              </p>
            </div>

            {/* آجل */}
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] text-muted-foreground">آجل</span>
              </div>
              <p className="text-lg font-bold text-orange-500">
                {toEnglishNumbers(summary.deferredTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <ScrollArea className="flex-1 h-[350px]">
          <div className="p-4">
            {sortedTransactions.length === 0 ? (
              /* Empty State */
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-3">
                  <FileText className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">لا توجد مساهمات</p>
                <p className="text-xs text-muted-foreground mt-1">لم يتم تسجيل أي دفعات لهذا الشريك بعد</p>
              </div>
            ) : (
              /* Transactions List */
              <div className="space-y-2">
                <AnimatePresence>
                  {sortedTransactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "p-3 rounded-xl border",
                        tx.source === 'vehicle'
                          ? (isPartnerFirst ? "bg-emerald-500/5 border-emerald-500/20" : "bg-orange-500/5 border-orange-500/20")
                          : "bg-primary/5 border-primary/20"
                      )}
                    >
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
                          {/* مصدر البند */}
                          {tx.source === 'vehicle' && tx.vehicleName && (
                            <div className="flex items-center gap-1 mt-1">
                              <Truck className="w-3 h-3 text-cyan-500" />
                              <span className="text-[10px] text-cyan-500 font-medium">{tx.vehicleName}</span>
                            </div>
                          )}
                          {tx.source === 'shared' && (
                            <span className="text-[10px] text-muted-foreground mt-1 inline-block">بند عام</span>
                          )}
                        </div>
                        <div className="text-left">
                          <p className={cn(
                            "font-bold",
                            isPartnerFirst ? 'text-emerald-500' : 'text-orange-500'
                          )}>
                            {toEnglishNumbers(tx.amount)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
