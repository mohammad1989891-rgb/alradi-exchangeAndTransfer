'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useData } from '@/contexts/DataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function ExchangeRateModal() {
  const { 
    isExchangeRateModalOpen, 
    editingCurrencyForExchangeRate, 
    closeExchangeRateModal,
    openCurrencyModal 
  } = useAppStore();
  const { activateCurrency } = useData();
  const { toast } = useToast();
  
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('1');
  const [conversionMethod, setConversionMethod] = useState<'MULTIPLY' | 'DIVIDE'>('MULTIPLY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset input when modal opens
  useEffect(() => {
    if (editingCurrencyForExchangeRate) {
      setExchangeRateInput(String(editingCurrencyForExchangeRate.exchangeRate || 1));
      setConversionMethod(editingCurrencyForExchangeRate.conversionMethod || 'MULTIPLY');
    }
  }, [editingCurrencyForExchangeRate]);
  
  const handleSave = async () => {
    if (!editingCurrencyForExchangeRate) return;
    
    const rate = parseFloat(exchangeRateInput);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال قيمة صحيحة أكبر من صفر',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await activateCurrency(editingCurrencyForExchangeRate.id, rate, conversionMethod);
      toast({
        title: 'تم التفعيل',
        description: `تم تفعيل ${editingCurrencyForExchangeRate.name} بنجاح`,
        className: 'bg-emerald-500 text-white'
      });
      closeExchangeRateModal();
    } catch (error) {
      console.error('Error activating currency:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تفعيل العملة',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    closeExchangeRateModal();
    // Re-open currency modal after a small delay for smooth transition
    setTimeout(() => {
      openCurrencyModal();
    }, 100);
  };
  
  // Get currency flag
  const getCurrencyFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧',
      'SAR': '🇸🇦', 'AED': '🇦🇪', 'KWD': '🇰🇼', 'BHD': '🇧🇭',
      'QAR': '🇶🇦', 'OMR': '🇴🇲', 'SYP': '🇸🇾', 'LBP': '🇱🇧',
      'JOD': '🇯🇴', 'IQD': '🇮🇶', 'TRY': '🇹🇷',
      'EGP': '🇪🇬', 'TND': '🇹🇳', 'DZD': '🇩🇿', 'MAD': '🇲🇦',
    };
    return flags[code] || '💱';
  };
  
  if (!editingCurrencyForExchangeRate) return null;
  
  // Calculate preview value
  const previewValue = conversionMethod === 'MULTIPLY' 
    ? (parseFloat(exchangeRateInput) || 0)
    : (1 / (parseFloat(exchangeRateInput) || 1));
  
  return (
    <Dialog open={isExchangeRateModalOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{getCurrencyFlag(editingCurrencyForExchangeRate.code)}</span>
            تحديد عامل التحويل
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            كم يساوي 1 وحدة من هذه العملة بالدولار الأمريكي؟
          </p>
          
          {/* Conversion Method Selection */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConversionMethod('MULTIPLY')}
              className={cn(
                'flex-1 gap-1',
                conversionMethod === 'MULTIPLY'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : ''
              )}
            >
              <ArrowUpRight className="w-4 h-4" />
              ضرب (×)
            </Button>
            <Button
              variant="outline"
              onClick={() => setConversionMethod('DIVIDE')}
              className={cn(
                'flex-1 gap-1',
                conversionMethod === 'DIVIDE'
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  : ''
              )}
            >
              <ArrowDownRight className="w-4 h-4" />
              قسمة (÷)
            </Button>
          </div>
          
          {/* Exchange Rate Input */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              {editingCurrencyForExchangeRate.symbol}
            </span>
            <span className="text-muted-foreground">
              {conversionMethod === 'MULTIPLY' ? '×' : '÷'}
            </span>
            <Input
              type="number"
              step="0.0001"
              value={exchangeRateInput}
              onChange={(e) => setExchangeRateInput(e.target.value)}
              className="flex-1"
              placeholder="0.00"
              autoFocus
            />
            <span className="text-lg font-bold">= 1 $</span>
          </div>
          
          {/* Preview */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">النتيجة:</p>
            <p className="text-sm font-medium">
              1 {editingCurrencyForExchangeRate.code} = {previewValue.toFixed(4)} USD
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري...' : 'تفعيل'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
