/**
 * Utilities for grouping records by Arabic month/year.
 * Simplified: no financial totals — only month label + operation count.
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

/**
 * Simple month group — only key, label, and items.
 * Financial totals (مجموع لنا/علينا/صافي) are intentionally omitted
 * for performance and per the UI Freeze requirement.
 */
export interface SimpleMonthGroup<T = unknown> {
  key: string; // e.g., "2026-01"
  year: number; // e.g., 2026
  month: number; // 1-12
  label: string; // e.g., "يناير 2026"
  items: T[]; // all items in this month
  count: number; // total number of operations (items.length)
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
 * Groups items by their `date` field (year-month).
 * Returns groups sorted by date descending (most recent first).
 * Each group has: key, year, month, label, items, and count.
 *
 * Financial totals are NOT computed here — removed for performance
 * and per the UI Freeze requirement (مجموع لنا/علينا/صافي removed).
 */
export function groupByMonth<T extends DatedItem>(
  items: T[],
): SimpleMonthGroup<T>[] {
  const map = new Map<string, SimpleMonthGroup<T>>();

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
        count: 0,
      };
      map.set(key, group);
    }

    group.items.push(item);
    group.count++;
  }

  return Array.from(map.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );
}

/**
 * Alias for clarity — same as groupByMonth.
 * Used by debt and exchange pages.
 */
export const groupByMonthGeneric = groupByMonth;
