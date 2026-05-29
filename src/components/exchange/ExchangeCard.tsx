'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, TrendingUp, TrendingDown, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
import type { Currency } from '@/lib/supabaseDb';
import type { Exchange } from '@/lib/supabaseDb';
import { Button } from '@/components/ui/button';
import { ExchangeDetailsModal } from './ExchangeDetailsModal';
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

interface ExchangeCardProps {
  exchange: Exchange;
  currencies: Currency[];
  onDelete: (id: string) => void;
}

export function ExchangeCard({ exchange, currencies, onDelete }: ExchangeCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const outgoingCurrency = currencies.find(c => c.id === exchange.outgoingCurrencyId);
  const incomingCurrency = currencies.find(c => c.id === exchange.incomingCurrencyId);
  
  const isProfit = exchange.profit >= 0;
  
  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-2xl bg-gradient-to-br border border-border/50 p-4 shadow-sm hover:shadow-md transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'p-2 rounded-xl',
              isProfit 
                ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            )}>
              <ArrowLeftRight className={cn(
                'w-5 h-5',
                isProfit ? 'text-emerald-600' : 'text-red-600'
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{formatDate(exchange.date)}</p>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">{outgoingCurrency?.symbol}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-bold text-sm">{incomingCurrency?.symbol}</span>
              </div>
            </div>
          </div>
          
          {/* Profit Badge */}
          <div className={cn(
            'px-3 py-1.5 rounded-full text-sm font-bold',
            isProfit 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          )}>
            {isProfit ? '+' : ''}{formatNumber(exchange.profit, 2)} $
          </div>
        </div>
        
        {/* Exchange Details */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Outgoing */}
          <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 p-3 border border-red-100 dark:border-red-900/30">
            <p className="text-xs text-muted-foreground mb-1">المبلغ الصادر</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatNumber(exchange.outgoingAmount)} {outgoingCurrency?.symbol}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {formatNumber(exchange.outgoingUsd, 2)} USD
            </p>
          </div>
          
          {/* Incoming */}
          <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 p-3 border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-xs text-muted-foreground mb-1">المبلغ الوارد</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(exchange.incomingAmount)} {incomingCurrency?.symbol}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {formatNumber(exchange.incomingUsd, 2)} USD
            </p>
          </div>
        </div>
        
        {/* Description */}
        {exchange.description && (
          <p className="text-xs text-muted-foreground mb-3 px-1">
            {exchange.description}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(true)}
            className="flex-1 gap-1.5"
          >
            <Info className="w-4 h-4" />
            تفاصيل الربح
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
      
      {/* Details Modal */}
      <ExchangeDetailsModal
        exchange={exchange}
        currencies={currencies}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عملية الصرف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه العملية؟
              <br />
              المبلغ الصادر: {formatNumber(exchange.outgoingAmount)} {outgoingCurrency?.symbol}
              <br />
              المبلغ الوارد: {formatNumber(exchange.incomingAmount)} {incomingCurrency?.symbol}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(exchange.id);
                setShowDeleteDialog(false);
              }}
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
