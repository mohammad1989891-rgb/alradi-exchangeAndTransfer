'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
import type { Debt } from '@/types';

interface DebtCardProps {
  debt: Debt;
  index: number;
  onClick?: () => void;
}

export function DebtCard({ debt, index, onClick }: DebtCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-200',
        'hover:shadow-md active:scale-[0.98]',
        debt.isPaid 
          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
          : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30'
      )}
    >
      {/* Side indicator */}
      <div className={cn(
        'absolute right-0 top-0 bottom-0 w-1',
        debt.isPaid ? 'bg-green-500' : 'bg-amber-500'
      )} />
      
      <div className="p-4 pr-5 flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          debt.isPaid 
            ? 'bg-green-100 dark:bg-green-900/50' 
            : 'bg-amber-100 dark:bg-amber-900/50'
        )}>
          {debt.isPaid ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">
              {debt.account?.name}
            </span>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              debt.isPaid 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
            )}>
              {debt.isPaid ? 'مدفوع' : 'دين'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(debt.date)}</span>
            {debt.description && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">{debt.description}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Amount */}
        <div className="text-left flex-shrink-0">
          <p className={cn(
            'text-lg font-bold',
            debt.isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
          )}>
            {formatNumber(debt.finalBalance)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {debt.currency?.symbol}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Debt Detail Card for modal
interface DebtDetailCardProps {
  debt: Debt;
}

export function DebtDetailCard({ debt }: DebtDetailCardProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={cn(
        'rounded-xl p-4',
        debt.isPaid ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            debt.isPaid ? 'bg-green-100 dark:bg-green-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
          )}>
            {debt.isPaid ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div>
            <p className="text-2xl font-bold">
              {formatNumber(debt.finalBalance)} {debt.currency?.symbol}
            </p>
            <p className={cn(
              'text-sm font-medium',
              debt.isPaid ? 'text-green-600' : 'text-amber-600'
            )}>
              {debt.isPaid ? 'تم السداد' : 'دين مستحق'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailItem label="الحساب" value={debt.account?.name || '-'} />
        <DetailItem label="العملة" value={debt.currency?.name || '-'} />
        <DetailItem label="المبلغ الأساسي" value={`${formatNumber(debt.amount)} ${debt.currency?.symbol}`} />
        <DetailItem 
          label="معامل التحويل" 
          value={`${debt.conversionFactor} (${debt.conversionMethod === 'MULTIPLY' ? 'ضرب' : 'قسمة'})`} 
        />
        <DetailItem 
          label="الرصيد النهائي" 
          value={`${formatNumber(debt.finalBalance)} ${debt.currency?.symbol}`}
          highlight
        />
        {debt.paidAt && (
          <DetailItem 
            label="تاريخ السداد" 
            value={formatDate(debt.paidAt)}
          />
        )}
      </div>
      
      {/* Description */}
      {debt.description && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">البيان</p>
          <p className="text-sm">{debt.description}</p>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg p-3',
      highlight ? 'bg-primary/10' : 'bg-muted/50'
    )}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn('text-sm font-medium', highlight && 'text-primary')}>{value}</p>
    </div>
  );
}
