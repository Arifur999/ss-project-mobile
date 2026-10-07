import { useQuery } from '@tanstack/react-query';

import { http } from '@/lib/httpClient';

/** One thing that was done: a sale written, an expense entered, stock taken in. */
export type ActivityEvent = {
  at: string;
  /** The server's English name for it - "Sale", "Expense", "Due collected". */
  kind: string;
  title: string;
  subtitle: string;
  amount: number;
  /** Money in, money out, or neither - stock movements carry no amount. */
  direction: 'in' | 'out' | 'none';
};

export type DayActivity = { date: string; count: number; totals: { in: number; out: number }; events: ActivityEvent[] };

/**
 * Everything entered on a day, gathered by the server from the tables the
 * work landed in and dated by when it was entered, not by the invoice date -
 * the website's Today's history.
 */
export function useDayActivity(date: string) {
  return useQuery({ queryKey: ['activity', date], queryFn: () => http.get<DayActivity>(`/activity/day?date=${date}`) });
}
