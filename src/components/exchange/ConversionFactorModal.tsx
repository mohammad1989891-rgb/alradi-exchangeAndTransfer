'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { Settings, Calculator } from 'lucide-react';
import type { Vault } from '@/types';

interface ConversionFactorModalProps {
  vault: Vault | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (vaultId: string, factor: number) => Promise<void>;
  mainCurrencySymbol?: string;
}

export function ConversionFactorModal({ 
  vault, 
  isOpen, 
  onClose, 
  onSave,
  mainCurrencySymbol 
}: ConversionFactorModalProps) {
  const [factor, setFactor] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (vault) {
      setFactor(String(vault.conversionFactorToMain || 1));
    }
  }, [vault]);
  
  const handleSubmit = async () => {
    if (!vault) return;
    
    setIsSubmitting(true);
    try {
      await onSave(vault.id, parseFloat(factor) || 1);
      onClose();
    } catch (error) {
      console.error('Error saving conversion factor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Preview calculation
  const previewValue = (vault?.balance || 0) * (parseFloat(factor) || 1);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            معامل التحويل
          </DialogTitle>
          <DialogDescription>
            تحديد معامل التحويل من {vault?.currency?.name} إلى العملة الرئيسية
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Current Vault Info */}
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">العملة</span>
              <span className="font-semibold flex items-center gap-1">
                {vault?.currency?.symbol}
                <span className="text-muted-foreground text-sm">({vault?.currency?.name})</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الرصيد الحالي</span>
              <span className="font-bold">
                {formatNumber(vault?.balance || 0)} {vault?.currency?.symbol}
              </span>
            </div>
          </div>
          
          {/* Conversion Factor Input */}
          <div className="space-y-2">
            <Label>معامل التحويل إلى العملة الرئيسية</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">1 {vault?.currency?.code} =</span>
              <Input
                type="number"
                step="0.0001"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                className="text-left font-mono"
                dir="ltr"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{mainCurrencySymbol}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              مثال: إذا كان 1 دولار = 15000 ليرة سورية، أدخل 15000
            </p>
          </div>
          
          {/* Preview */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">المكافئ بالعملة الرئيسية</span>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatNumber(previewValue)} {mainCurrencySymbol}
            </p>
          </div>
          
          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ معامل التحويل'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
