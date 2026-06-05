'use client';

import { useEffect, useRef, useCallback } from 'react';

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Number of items to load per batch */
  batchSize?: number;
  /** Currently visible count (controlled from parent) */
  visibleCount: number;
  /** Callback to load more items */
  onLoadMore: (newCount: number) => void;
  /** Total count of items */
  totalCount: number;
  /** Additional class name for the container */
  className?: string;
  /** Key prefix for items */
  keyPrefix?: string;
  /** Get unique key for each item */
  getKey: (item: T, index: number) => string;
}

/**
 * LazyList — renders only visible items with IntersectionObserver
 * for progressive loading as the user scrolls.
 *
 * Instead of a full virtual list (which requires fixed item heights),
 * this component uses a sentinel element at the bottom. When the
 * sentinel becomes visible, it triggers loading of the next batch.
 */
export function LazyList<T>({
  items,
  renderItem,
  batchSize = 50,
  visibleCount,
  onLoadMore,
  totalCount,
  className = '',
  getKey,
}: LazyListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingRef.current && visibleCount < totalCount) {
        isLoadingRef.current = true;
        const newCount = Math.min(visibleCount + batchSize, totalCount);
        onLoadMore(newCount);
        // Small delay to prevent rapid loading
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }
    },
    [visibleCount, totalCount, batchSize, onLoadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: null, // viewport
      rootMargin: '200px', // Start loading 200px before reaching the bottom
      threshold: 0,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < totalCount;

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <div key={getKey(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
      {/* Sentinel element for IntersectionObserver */}
      {hasMore && (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      )}
      {/* Manual load more fallback */}
      {hasMore && (
        <button
          type="button"
          onClick={() => {
            const newCount = Math.min(visibleCount + batchSize, totalCount);
            onLoadMore(newCount);
          }}
          className="w-full py-2 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          عرض المزيد ({totalCount - visibleCount} متبقي)
        </button>
      )}
    </div>
  );
}
