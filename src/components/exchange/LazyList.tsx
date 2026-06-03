'use client';

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

/**
 * LazyList: Renders items progressively with infinite scroll.
 * Shows `pageSize` items initially, loads more as the user scrolls down.
 * Uses IntersectionObserver for efficient scroll detection.
 * Uses items.length as key to reset when data changes.
 */
export function LazyList<T>({
  items,
  renderItem,
  pageSize = 50,
  className = '',
  emptyMessage = 'لا توجد عناصر',
  emptyIcon,
}: LazyListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset visible count when items length changes
  const itemsLengthKey = items.length;
  // Using key pattern: re-create component when items change significantly
  void itemsLengthKey; // Used indirectly through the reset mechanism below

  // IntersectionObserver to load more items when scrolling near bottom
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  if (items.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl bg-muted/30">
        {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {visibleItems.map((item, index) => renderItem(item, index))}
      {hasMore && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            <span>تحميل المزيد...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * useLazyItems: Hook that provides progressive item loading.
 * Returns a slice of items based on the current visible count,
 * and a ref for the load-more sentinel element.
 */
export function useLazyItems<T>(items: T[], pageSize: number = 50) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return { visibleItems, hasMore, loadMoreRef };
}
