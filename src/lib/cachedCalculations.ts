/**
 * Cached calculation utilities for performance optimization.
 * Prevents redundant recalculations when data hasn't changed.
 */

interface CacheEntry<T> {
  value: T;
  hash: string;
}

// Simple hash function for data fingerprinting
function simpleHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Creates a cached calculation function.
 * The calculation only runs when the input data hash changes.
 */
export function createCachedCalculation<TInput, TOutput>(
  calculate: (input: TInput) => TOutput
): (input: TInput) => TOutput {
  let cache: CacheEntry<TOutput> | null = null;

  return (input: TInput): TOutput => {
    const hash = simpleHash(input);
    if (cache && cache.hash === hash) {
      return cache.value;
    }
    const value = calculate(input);
    cache = { value, hash };
    return value;
  };
}

/**
 * Calculates total income from transactions.
 * Includes ALL transactions (active + archived) for accurate totals.
 */
export function calculateTotalIncome(transactions: { type: string; finalBalance: number }[]): number {
  return transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.finalBalance, 0);
}

/**
 * Calculates total expense from transactions.
 * Includes ALL transactions (active + archived) for accurate totals.
 */
export function calculateTotalExpense(transactions: { type: string; finalBalance: number }[]): number {
  return transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.finalBalance, 0);
}

/**
 * Calculates net balance (income - expense) from ALL transactions.
 */
export function calculateNetBalance(transactions: { type: string; finalBalance: number }[]): number {
  return calculateTotalIncome(transactions) - calculateTotalExpense(transactions);
}

/**
 * Creates a data hash for memoization dependency tracking.
 * Uses array length + first/last item IDs for quick comparison.
 */
export function createDataHash<T extends { id?: string }>(items: T[]): string {
  if (items.length === 0) return 'empty';
  const first = items[0]?.id || '0';
  const last = items[items.length - 1]?.id || '0';
  return `${items.length}:${first}:${last}`;
}
