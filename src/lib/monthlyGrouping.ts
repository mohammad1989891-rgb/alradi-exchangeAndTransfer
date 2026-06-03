/**
 * Utilities for grouping records by Arabic month/year.
 */

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

export interface MonthGroup<T> {
  key: string; // e.g., "2026-01"
  year: number; // e.g., 2026
  month: number; // 1-12
  label: string; // e.g., "يناير 2026"
  items: T[]; // all items in this month
  totalIncome: number; // sum of finalBalance for INCOME items (in USD equivalent)
  totalExpense: number; // sum of finalBalance for EXPENSE items (in USD equivalent)
  netBalance: number; // totalIncome - totalExpense
}

interface FinancialItem {
  date: string | Date;
  type?: string;
  finalBalance?: number;
}

interface DatedItem {
  date: string | Date;
}

/**
 * Normalises a date value to an ISO date string (`YYYY-MM-DD`).
 * Accepts either a string or a JavaScript `Date` object.
 */
function toISODateStr(date: string | Date): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    // Use ISO string which starts with YYYY-MM-DD
    const iso = date.toISOString();
    return iso.split('T')[0] || null;
  }
  return date;
}

/**
 * Extracts year and month (1-based) from an ISO date string or Date object.
 * Returns `null` for invalid or empty values.
 */
function parseYearMonth(date: string | Date): { year: number; month: number } | null {
  const str = toISODateStr(date);
  if (!str) return null;
  const match = /^(\d{4})-(\d{2})/.exec(str);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Groups items by their `date` field (year-month) and computes financial totals.
 *
 * - `totalIncome`  – sum of `finalBalance` for items where `type === 'INCOME'`
 * - `totalExpense` – sum of `finalBalance` for items where `type === 'EXPENSE'`
 * - `netBalance`   – `totalIncome - totalExpense`
 *
 * Groups are sorted by date descending (most recent first).
 */
export function groupByMonth<T extends FinancialItem>(
  items: T[],
): MonthGroup<T>[] {
  const map = new Map<string, MonthGroup<T>>();

  for (const item of items) {
    const parsed = parseYearMonth(item.date);
    if (!parsed) continue;

    const { year, month } = parsed;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        year,
        month,
        label: `${ARABIC_MONTHS[month - 1]} ${year}`,
        items: [],
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
      };
      map.set(key, group);
    }

    group.items.push(item);

    const balance = item.finalBalance ?? 0;
    if (item.type === 'INCOME') {
      group.totalIncome += balance;
    } else if (item.type === 'EXPENSE') {
      group.totalExpense += balance;
    }
  }

  // Derive netBalance after all items are accumulated
  for (const group of map.values()) {
    group.netBalance = group.totalIncome - group.totalExpense;
  }

  return Array.from(map.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );
}

/**
 * Simple grouping by month without financial calculations.
 * Useful for debts, exchanges, and other non-financial records.
 */
export function groupByMonthGeneric<T extends DatedItem>(
  items: T[],
): { key: string; year: number; month: number; label: string; items: T[] }[] {
  const map = new Map<
    string,
    { key: string; year: number; month: number; label: string; items: T[] }
  >();

  for (const item of items) {
    const parsed = parseYearMonth(item.date);
    if (!parsed) continue;

    const { year, month } = parsed;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        year,
        month,
        label: `${ARABIC_MONTHS[month - 1]} ${year}`,
        items: [],
      };
      map.set(key, group);
    }

    group.items.push(item);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );
}
