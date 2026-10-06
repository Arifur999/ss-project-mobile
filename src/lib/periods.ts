import { addDays, toISODate } from './dates';

// The date windows the screens filter by. Every range is inclusive and spelled
// YYYY-MM-DD, which is what the API's ?from=&to= expects.

export type Range = { from: string; to: string };

/** The dashboard's "Select period" sheet. */
export type DashboardPeriod = 'today' | 'week' | 'month' | 'last' | 'year';

/** The ledger's and transfer list's chips. 'all' has no bounds. */
export type ListPeriod = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear';

/**
 * The window a dashboard period covers. The week runs Saturday to Friday, the
 * working week in Bangladesh, as the design's "26 Sep – 2 Oct 2026" does for a
 * Wednesday.
 */
export function dashboardRange(period: DashboardPeriod, now = new Date()): Range {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'today':
      return { from: toISODate(now), to: toISODate(now) };
    case 'week': {
      const sinceSaturday = (now.getDay() + 1) % 7;
      const start = addDays(now, -sinceSaturday);
      return { from: toISODate(start), to: toISODate(addDays(start, 6)) };
    }
    case 'last':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'month':
    default:
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
  }
}

/** The window a list chip covers; null means everything. */
export function listRange(period: ListPeriod, now = new Date()): Range | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'thisMonth':
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case 'thisYear':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'all':
    default:
      return null;
  }
}

/** The seven days ending today - the cashflow chart, whatever the period says. */
export function lastSevenDays(now = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(now, i - 6)));
}

/** True when a row's date (or timestamp) falls inside the range. */
export function inRange(date: unknown, range: Range | null): boolean {
  if (!range) return true;
  const day = String(date || '').slice(0, 10);
  return day >= range.from && day <= range.to;
}

/** "?from=…&to=…" for a list endpoint, or "" for no bounds. */
export function rangeQuery(range: Range | null): string {
  return range ? `?from=${range.from}&to=${range.to}` : '';
}
