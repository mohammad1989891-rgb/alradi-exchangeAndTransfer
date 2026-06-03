'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import type { MonthGroup } from '@/lib/monthlyGrouping';

interface MonthCardProps<T> {
  group: MonthGroup<T>;
  renderItem: (item: T, index: number) => React.ReactNode;
  defaultExpanded?: boolean;
}

export function MonthCard<T>({ group, renderItem, defaultExpanded = false }: MonthCardProps<T>) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { label, items, totalIncome, totalExpense, netBalance } = group;
  const count = items.length;

  const borderColor =
    netBalance > 0
      ? 'border-l-emerald-500 dark:border-l-emerald-400'
      : netBalance < 0
        ? 'border-l-red-500 dark:border-l-red-400'
        : 'border-l-gray-400 dark:border-l-gray-500';

  const netColor =
    netBalance > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : netBalance < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  const NetIcon = netBalance > 0 ? TrendingUp : netBalance < 0 ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-all duration-200',
        'border-l-[3px]',
        borderColor
      )}
    >
      {/* Header — clickable */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'w-full text-right p-3 flex flex-col gap-1.5 transition-colors duration-150',
          'hover:bg-muted/40 active:bg-muted/60'
        )}
      >
        {/* Top row: label + chevron */}
        <div className="flex items-center justify-between">
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
        </div>

        {/* Bottom row: stats */}
        <div className="flex items-center justify-between text-xs">
          {/* Item count */}
          <span className="text-muted-foreground">
            {count} {count === 1 ? 'حركة' : count === 2 ? 'حركتين' : count <= 10 ? 'حركات' : 'حركة'}
          </span>

          {/* Financial summary */}
          <div className="flex items-center gap-3">
            {/* Net balance */}
            <span className={cn('flex items-center gap-0.5 font-medium', netColor)}>
              <NetIcon className="w-3 h-3" />
              الصافي {formatNumber(netBalance)}
            </span>

            {/* Expense */}
            <span className="text-red-600 dark:text-red-400">
              علينا {formatNumber(totalExpense)}
            </span>

            {/* Income */}
            <span className="text-emerald-600 dark:text-emerald-400">
              لنا {formatNumber(totalIncome)}
            </span>
          </div>
        </div>
      </button>

      {/* Collapsible items */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5">
              {items.map((item, index) => renderItem(item, index))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
