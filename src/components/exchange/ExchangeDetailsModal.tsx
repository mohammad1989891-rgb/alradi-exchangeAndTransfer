'use client';

import type { Currency, Exchange } from '@/lib/localDb';
import { formatNumber, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isSYPCurrency, convertToNewVersion } from '@/lib/syp-conversion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Calculator, DollarSign, Info } from 'lucide-react';

interface ExchangeDetailsModalProps {
  exchange: Exchange;
  currencies: Currency[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExchangeDetailsModal({ 
  exchange, 
  currencies, 
  open, 
  onOpenChange 
}: ExchangeDetailsModalProps) {
  const outgoingCurrency = currencies.find(c => c.id === exchange.outgoingCurrencyId);
  const incomingCurrency = currencies.find(c => c.id === exchange.incomingCurrencyId);
  
  const isOutgoingSYP = isSYPCurrency(exchange.outgoingCurrencyId, outgoingCurrency?.code);
  const isIncomingSYP = isSYPCurrency(exchange.incomingCurrencyId, incomingCurrency?.code);
  
  const isProfit = exchange.profit >= 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            تفاصيل عملية الصرف
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Date */}
          <div className="text-sm text-muted-foreground">
            التاريخ: {formatDate(exchange.date)}
          </div>
          
          {/* Profit/Loss Summary */}
          <div className={cn(
            'rounded-xl p-4 border',
            isProfit 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isProfit ? (
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
                <span className="font-medium">
                  {isProfit ? 'ربح' : 'خسارة'}
                </span>
              </div>
              <span className={cn(
                'text-2xl font-bold',
                isProfit ? 'text-emerald-600' : 'text-red-600'
              )}>
                {isProfit ? '+' : ''}{formatNumber(exchange.profit, 2)} $
              </span>
            </div>
          </div>
          
          {/* Calculation Steps */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              خطوات الحساب
            </h4>
            
            {/* Step 1: Outgoing Amount */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                1. تحويل المبلغ الصادر إلى دولار
              </p>
              <div className="bg-background rounded-lg p-2 font-mono text-sm">
                <p>{formatNumber(exchange.outgoingAmount)} {outgoingCurrency?.code}
                  {isOutgoingSYP && <span className="text-xs text-muted-foreground"> ({convertToNewVersion(exchange.outgoingAmount).toFixed(2)} جديد)</span>}
                </p>
                <p className="text-muted-foreground">
                  {exchange.outgoingConversionMethod === 'MULTIPLY' ? '×' : '÷'} {formatNumber(exchange.outgoingRateAtTime, 4)}
                </p>
                <p className="font-bold border-t pt-2 mt-2">
                  = {formatNumber(exchange.outgoingUsd, 4)} USD
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                سعر التحويل وقت العملية: 1 {outgoingCurrency?.code} = {formatNumber(exchange.outgoingRateAtTime, 4)} $
                ({exchange.outgoingConversionMethod === 'MULTIPLY' ? 'ضرب' : 'قسمة'})
              </p>
            </div>
            
            {/* Step 2: Incoming Amount */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                2. تحويل المبلغ الوارد إلى دولار
              </p>
              <div className="bg-background rounded-lg p-2 font-mono text-sm">
                <p>{formatNumber(exchange.incomingAmount)} {incomingCurrency?.code}
                  {isIncomingSYP && <span className="text-xs text-muted-foreground"> ({convertToNewVersion(exchange.incomingAmount).toFixed(2)} جديد)</span>}
                </p>
                <p className="text-muted-foreground">
                  {exchange.incomingConversionMethod === 'MULTIPLY' ? '×' : '÷'} {formatNumber(exchange.incomingRateAtTime, 4)}
                </p>
                <p className="font-bold border-t pt-2 mt-2">
                  = {formatNumber(exchange.incomingUsd, 4)} USD
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                سعر التحويل وقت العملية: 1 {incomingCurrency?.code} = {formatNumber(exchange.incomingRateAtTime, 4)} $
                ({exchange.incomingConversionMethod === 'MULTIPLY' ? 'ضرب' : 'قسمة'})
              </p>
            </div>
            
            {/* Step 3: Profit Calculation */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                3. حساب الربح/الخسارة
              </p>
              <div className="bg-background rounded-lg p-2 font-mono text-sm">
                <p>{formatNumber(exchange.incomingUsd, 4)} USD (الوارد)</p>
                <p className="text-muted-foreground">- {formatNumber(exchange.outgoingUsd, 4)} USD (الصادر)</p>
                <p className={cn(
                  'font-bold border-t pt-2 mt-2',
                  isProfit ? 'text-emerald-600' : 'text-red-600'
                )}>
                  = {isProfit ? '+' : ''}{formatNumber(exchange.profit, 4)} USD
                </p>
              </div>
            </div>
          </div>
          
          {/* Note */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <DollarSign className="w-4 h-4 inline ml-1" />
            جميع القيم محسوبة بسعر الصرف وقت إجراء العملية (Snapshot) ولا تتغير مع تغير الأسعار لاحقًا.
          </div>
          
          {/* Description */}
          {exchange.description && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
              <p className="text-sm">{exchange.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
