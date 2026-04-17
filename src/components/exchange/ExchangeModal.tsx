'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useData } from '@/contexts/DataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatNumber } from '@/lib/format';
import type { Currency } from '@/lib/localDb';

export function ExchangeModal() {
  const { 
    isExchangeModalOpen, 
    closeExchangeModal
  } = useAppStore();
  const { currencies, addExchange } = useData();
  const { toast } = useToast();
  
  const [outgoingCurrencyId, setOutgoingCurrencyId] = useState<string>('');
  const [incomingCurrencyId, setIncomingCurrencyId] = useState<string>('');
  const [outgoingAmount, setOutgoingAmount] = useState<string>('');
  const [incomingAmount, setIncomingAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter active currencies (excluding USD)
  const activeCurrencies = currencies.filter(c => c.isActive);
  const activeCurrenciesForOutgoing = activeCurrencies.filter(c => c.id !== incomingCurrencyId);
  const activeCurrenciesForIncoming = activeCurrencies.filter(c => c.id !== outgoingCurrencyId);
  
  // Get selected currencies
  const outgoingCurrency = currencies.find(c => c.id === outgoingCurrencyId);
  const incomingCurrency = currencies.find(c => c.id === incomingCurrencyId);
  
  // Preview calculation
  const previewOutgoingUsd = outgoingCurrency && outgoingAmount
    ? outgoingCurrency.conversionMethod === 'MULTIPLY'
      ? parseFloat(outgoingAmount) * outgoingCurrency.exchangeRate
      : parseFloat(outgoingAmount) / outgoingCurrency.exchangeRate
    : 0;
  
  const previewIncomingUsd = incomingCurrency && incomingAmount
    ? incomingCurrency.conversionMethod === 'MULTIPLY'
      ? parseFloat(incomingAmount) * incomingCurrency.exchangeRate
      : parseFloat(incomingAmount) / incomingCurrency.exchangeRate
    : 0;
  
  const previewProfit = previewIncomingUsd - previewOutgoingUsd;
  
  const handleSubmit = async () => {
    if (!outgoingCurrencyId || !incomingCurrencyId || !outgoingAmount || !incomingAmount) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }
    
    if (outgoingCurrencyId === incomingCurrencyId) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار عملتين مختلفتين',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addExchange({
        outgoingCurrencyId,
        incomingCurrencyId,
        outgoingAmount: parseFloat(outgoingAmount),
        incomingAmount: parseFloat(incomingAmount),
        description: description || undefined,
        date,
      });
      
      toast({
        title: 'تم بنجاح',
        description: `تم إنشاء عملية الصرف بنجاح`,
        className: 'bg-emerald-500 text-white'
      });
      
      // Reset form
      setOutgoingCurrencyId('');
      setIncomingCurrencyId('');
      setOutgoingAmount('');
      setIncomingAmount('');
      setDescription('');
      closeExchangeModal();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء العملية',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    closeExchangeModal();
    // Reset form
    setOutgoingCurrencyId('');
    setIncomingCurrencyId('');
    setOutgoingAmount('');
    setIncomingAmount('');
    setDescription('');
  };
  
  return (
    <Dialog open={isExchangeModalOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>عملية صرف جديدة</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Outgoing Currency */}
          <div className="space-y-2">
            <Label>العملة الصادرة (من)</Label>
            <Select value={outgoingCurrencyId} onValueChange={setOutgoingCurrencyId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العملة" />
              </SelectTrigger>
              <SelectContent>
                {activeCurrenciesForOutgoing.map(currency => (
                  <SelectItem key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Outgoing Amount */}
          <div className="space-y-2">
            <Label>المبلغ الصادر</Label>
            <Input
              type="number"
              step="0.01"
              value={outgoingAmount}
              onChange={(e) => setOutgoingAmount(e.target.value)}
              placeholder="0.00"
            />
            {outgoingCurrency && (
              <p className="text-xs text-muted-foreground">
                {outgoingCurrency.conversionMethod === 'MULTIPLY' ? 'ضرب' : 'قسمة'} × {outgoingCurrency.exchangeRate}
                {outgoingAmount && ` = ${formatNumber(previewOutgoingUsd, 2)} USD`}
              </p>
            )}
          </div>
          
          {/* Incoming Currency */}
          <div className="space-y-2">
            <Label>العملة الواردة (إلى)</Label>
            <Select value={incomingCurrencyId} onValueChange={setIncomingCurrencyId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العملة" />
              </SelectTrigger>
              <SelectContent>
                {activeCurrenciesForIncoming.map(currency => (
                  <SelectItem key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Incoming Amount */}
          <div className="space-y-2">
            <Label>المبلغ الوارد</Label>
            <Input
              type="number"
              step="0.01"
              value={incomingAmount}
              onChange={(e) => setIncomingAmount(e.target.value)}
              placeholder="0.00"
            />
            {incomingCurrency && (
              <p className="text-xs text-muted-foreground">
                {incomingCurrency.conversionMethod === 'MULTIPLY' ? 'ضرب' : 'قسمة'} × {incomingCurrency.exchangeRate}
                {incomingAmount && ` = ${formatNumber(previewIncomingUsd, 2)} USD`}
              </p>
            )}
          </div>
          
          {/* Profit Preview */}
          {outgoingAmount && incomingAmount && (
            <div className={`rounded-lg p-3 ${
              previewProfit >= 0 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
            }`}>
              <p className="text-xs text-muted-foreground mb-1">الربح المتوقع</p>
              <p className={`text-lg font-bold ${previewProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {previewProfit >= 0 ? '+' : ''}{formatNumber(previewProfit, 2)} USD
              </p>
            </div>
          )}
          
          {/* Date */}
          <div className="space-y-2">
            <Label>التاريخ</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف ملاحظة..."
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !outgoingCurrencyId || !incomingCurrencyId || !outgoingAmount || !incomingAmount}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isSubmitting ? 'جاري...' : 'إنشاء العملية'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
