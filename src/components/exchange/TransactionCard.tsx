'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, Banknote, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
import type { Transaction } from '@/types';

interface TransactionCardProps {
  transaction: Transaction;
  index: number;
  onClick?: () => void;
}

export function TransactionCard({ transaction, index, onClick }: TransactionCardProps) {
  const isIncome = transaction.type === 'INCOME';
  const isCash = transaction.paymentType === 'CASH';
  const hasConversion = transaction.baseCurrencyId && transaction.baseCurrencyId !== transaction.currencyId;
  const isOverflow = transaction.isOverflowTransaction;  // حركة ناتجة عن فائض
  const isIncomplete = !transaction.isComplete;  // 🔸 حركة غير مكتملة

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-200',
        'hover:shadow-md active:scale-[0.98]',
        // 🔸 تمييز الحركات غير المكتملة
        isIncomplete
          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400/70 dark:border-amber-600/50 border-dashed'
          : isOverflow
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300/70 dark:border-amber-700/50'
            : isIncome
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30'
              : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
      )}
    >
      {/* Side indicator */}
      <div className={cn(
        'absolute right-0 top-0 bottom-0 w-1',
        isIncomplete ? 'bg-amber-500 animate-pulse' : isOverflow ? 'bg-amber-500' : isIncome ? 'bg-emerald-500' : 'bg-red-500'
      )} />

      {/* 🔸 شارة غير مكتملة */}
      {isIncomplete && (
        <div className="absolute left-2 top-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 font-medium flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            غير مكتملة
          </span>
        </div>
      )}

      {/* شارة الفائض */}
      {isOverflow && (
        <div className="absolute left-2 top-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 font-medium flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" />
            فائض دفعة
          </span>
        </div>
      )}

      <div className={cn("p-4 pr-5 flex items-center gap-4", (isOverflow || isIncomplete) && "pt-8")}>
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isIncomplete
            ? 'bg-amber-100 dark:bg-amber-900/50'
            : isOverflow
              ? 'bg-amber-100 dark:bg-amber-900/50'
              : isIncome
                ? 'bg-emerald-100 dark:bg-emerald-900/50'
                : 'bg-red-100 dark:bg-red-900/50'
        )}>
          {isIncomplete ? (
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : isOverflow ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : isIncome ? (
            <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">
              {transaction.account?.name}
            </span>
            {/* Type Badge */}
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              isOverflow
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                : isIncome
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
            )}>
              {isOverflow ? 'فائض' : isIncome ? 'لنا' : 'علينا'}
            </span>
            {/* Payment Type Badge */}
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1',
              isCash
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
            )}>
              {isCash ? (
                <>
                  <Banknote className="w-3 h-3" />
                  كاش
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  آجل
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(transaction.date)}</span>
            {transaction.description && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">{transaction.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-left flex-shrink-0">
          <p className={cn(
            'text-lg font-bold',
            isOverflow
              ? 'text-amber-600 dark:text-amber-400'
              : isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
          )}>
            {formatNumber(transaction.finalBalance)}
          </p>
          <div className="flex items-center justify-end gap-1">
            <p className="text-[10px] text-muted-foreground">
              {transaction.currency?.symbol}
            </p>
            {hasConversion && (
              <p className="text-[9px] text-muted-foreground/70">
                ({formatNumber(transaction.amount)} {transaction.baseCurrency?.symbol})
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
