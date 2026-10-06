import { useQuery } from '@tanstack/react-query';

import { computeDashboard, type DashboardFigures } from '@/lib/dashboard';
import { todayISO } from '@/lib/dates';
import { dashboardRange, lastSevenDays, type DashboardPeriod } from '@/lib/periods';
import { fetchListOrDenied, spanOf } from '@/services/list.services';

export type DashboardData = DashboardFigures & {
  /** Sections the server refused this user - their figures are not real zeros. */
  denied: string[];
};

/**
 * Loads and computes the Dashboard for one period. Each table is fetched once
 * over the span every card needs (the period, the cashflow week, the chart
 * year) and the cards filter their own window from it - six requests, not
 * fifteen.
 */
export async function loadDashboard(period: DashboardPeriod, now = new Date()): Promise<DashboardData> {
  const range = dashboardRange(period, now);
  const weekDays = lastSevenDays(now);
  const week = { from: weekDays[0], to: weekDays[6] };
  const chartYear = Number(range.to.slice(0, 4));
  const year = { from: `${chartYear}-01-01`, to: `${chartYear}-12-31` };
  const lastMonth = chartYear === now.getFullYear() ? now.getMonth() + 1 : 12;

  const [sales, purchases, expenses, otherIncomes, customerPayments, supplierPayments] = await Promise.all([
    fetchListOrDenied('/sales', spanOf(range, week, year)),
    fetchListOrDenied('/purchases', spanOf(range, week)),
    fetchListOrDenied('/expenses', spanOf(range, week, year)),
    fetchListOrDenied('/other-incomes', spanOf(range, week)),
    fetchListOrDenied('/customer-payments', week),
    fetchListOrDenied('/supplier-payments', week),
  ]);

  const figures = computeDashboard(
    {
      period: { sales: sales.rows, purchases: purchases.rows, expenses: expenses.rows, otherIncomes: otherIncomes.rows },
      week: {
        sales: sales.rows,
        otherIncomes: otherIncomes.rows,
        customerPayments: customerPayments.rows,
        purchases: purchases.rows,
        expenses: expenses.rows,
        supplierPayments: supplierPayments.rows,
      },
      year: { sales: sales.rows, expenses: expenses.rows },
    },
    range,
    weekDays,
    chartYear,
    lastMonth,
  );

  const denied = Object.entries({ sales, purchases, expenses, otherIncomes, customerPayments, supplierPayments })
    .filter(([, result]) => result.denied)
    .map(([name]) => name);

  return { ...figures, denied };
}

/** The Dashboard's data, cached per period and per day. */
export function useDashboard(period: DashboardPeriod) {
  return useQuery({
    queryKey: ['dashboard', period, todayISO()],
    queryFn: () => loadDashboard(period),
  });
}
