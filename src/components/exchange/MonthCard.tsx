'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleMonthGroup {
  key: string;
  label: string;
  items: unknown[];
  count: number;
}

interface MonthCardProps<T> {
  group: SimpleMonthGroup & { items: T[] };
  renderItem: (item: T, index: number) => React.ReactNode;
  defaultExpanded?: boolean;
  /** Maximum items to show initially when expanded; 0 = show all */
  maxVisibleItems?: number;
}

const INITIAL_VISIBLE = 50;
const LOAD_MORE_COUNT = 50;

export function MonthCard<T>({ group, renderItem, defaultExpanded = false, maxVisibleItems = INITIAL_VISIBLE }: MonthCardProps<T>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [visibleCount, setVisibleCount] = useState(maxVisibleItems);

  const { label, items, count } = group;

  // When expanding, reset visible count
  const handleToggle = () => {
    const willExpand = !expanded;
    if (willExpand) {
      setVisibleCount(maxVisibleItems || count);
    }
    setExpanded(willExpand);
  };

  const visibleItems = useMemo(() => {
    if (maxVisibleItems === 0) return items; // 0 means show all
    return items.slice(0, visibleCount);
  }, [items, visibleCount, maxVisibleItems]);

  const hasMore = maxVisibleItems > 0 && visibleCount < count;

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-all duration-200',
        'border-l-[3px] border-l-muted-foreground/30'
      )}
    >
      {/* Header — clickable */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full text-right p-3 flex items-center justify-between transition-colors duration-150',
          'hover:bg-muted/40 active:bg-muted/60'
        )}
      >
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>

        <span className="text-xs text-muted-foreground">
          عدد العمليات: {count}
        </span>
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
              {visibleItems.map((item, index) => renderItem(item, index))}
              {hasMore && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, count));
                  }}
                  className="w-full py-2 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  عرض المزيد ({count - visibleCount} متبقي)
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
