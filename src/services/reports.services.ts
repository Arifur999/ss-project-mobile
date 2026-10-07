import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { toISODate } from '@/lib/dates';
import { http } from '@/lib/httpClient';
import { inRange, reportRange, type ReportPeriod } from '@/lib/periods';
import { buildReport, targetSpan, type ReportData } from '@/lib/reportSummary';
import { fetchListOrDenied } from '@/services/list.services';

type Row = Record<string, any>;

const completed = (rows: Row[]) => rows.filter((sale) => sale.status === 'completed');

/**
 * What the Report Summary reads for a period, fetched as the website's
 * loadReport does: the period's rows, sales over the whole months it touches
 * for the rolling target, every purchase for the buying targets, and the
 * targets and products. Anything the user may not read counts as nothing.
 * The period's rows are narrowed here too, so the figures hold even where an
 * endpoint ignores the dates.
 */
export async function loadReport(period: ReportPeriod, now = new Date()): Promise<ReportData> {
  const range = reportRange(period, now);
  const bounds = range ? { start: range.from, end: range.to } : { start: '', end: '' };
  const span = targetSpan(bounds);
  const [sales, purchases, expenses, supplierPayments, withdrawals, otherIncomes, targets, products, purchaseTargets] = await Promise.all([
    fetchListOrDenied('/sales', span ? { from: span.start, to: span.end } : null),
    fetchListOrDenied('/purchases'),
    fetchListOrDenied('/expenses', range),
    fetchListOrDenied('/supplier-payments', range),
    fetchListOrDenied('/profit-withdrawals', range),
    fetchListOrDenied('/other-incomes', range),
    fetchListOrDenied('/monthly-targets'),
    fetchListOrDenied('/products'),
    fetchListOrDenied('/purchase-targets'),
  ]);
  const within = (rows: Row[]) => rows.filter((row) => inRange(row.date, range));
  const spanSales = completed(sales.rows);
  return buildReport({
    range: bounds,
    today: toISODate(now),
    sales: within(spanSales),
    targetSales: spanSales,
    purchases: within(purchases.rows),
    allPurchases: purchases.rows,
    expenses: within(expenses.rows),
    supplierPayments: within(supplierPayments.rows),
    withdrawals: within(withdrawals.rows),
    otherIncomes: within(otherIncomes.rows),
    targets: targets.rows,
    products: products.rows,
    purchaseTargets: purchaseTargets.rows,
  });
}

export const REPORT_KEY = ['reports'] as const;

/** A period's report; the last one stays on screen while the next loads. */
export function useReport(period: ReportPeriod) {
  return useQuery({ queryKey: [...REPORT_KEY, period], queryFn: () => loadReport(period), placeholderData: keepPreviousData });
}

export type TargetData = {
  /** Newest month first. */
  salesTargets: Row[];
  purchaseTargets: Row[];
  suppliers: Row[];
  /** Every purchase, for how far each buying target has got. */
  purchases: Row[];
};

/** What the two target screens read. */
export async function loadTargets(): Promise<TargetData> {
  const [salesTargets, purchaseTargets, suppliers, purchases] = await Promise.all([
    fetchListOrDenied('/monthly-targets'),
    fetchListOrDenied('/purchase-targets'),
    fetchListOrDenied('/suppliers'),
    fetchListOrDenied('/purchases'),
  ]);
  return {
    salesTargets: [...salesTargets.rows].sort((a, b) => Number(b.year) - Number(a.year) || Number(b.month) - Number(a.month)),
    purchaseTargets: purchaseTargets.rows,
    suppliers: suppliers.rows.filter((s) => s.is_active !== false),
    purchases: purchases.rows,
  };
}

export const TARGETS_KEY = ['targets'] as const;

export function useTargets() {
  return useQuery({ queryKey: TARGETS_KEY, queryFn: loadTargets });
}

export type SalesTargetInput = { year: number; month: number; sales_target: number; profit_target: number };
export type PurchaseTargetInput = {
  supplier_id: string;
  start_year: number;
  start_month: number;
  end_year: number;
  end_month: number;
  total_amount: number;
};

/** One target a month: the server keeps the month's row up to date. */
export const saveSalesTarget = (input: SalesTargetInput) => http.put('/monthly-targets', input);
export const deleteSalesTarget = (id: string) => http.delete(`/monthly-targets/${id}`);
export const createPurchaseTarget = (input: PurchaseTargetInput) => http.post('/purchase-targets', input);
export const updatePurchaseTarget = (id: string, input: PurchaseTargetInput) => http.patch(`/purchase-targets/${id}`, input);
export const deletePurchaseTarget = (id: string) => http.delete(`/purchase-targets/${id}`);

/** Runs a write, then refetches the targets, every report and the dashboard's target. */
export function useTargetWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all([TARGETS_KEY, REPORT_KEY, ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return result;
    },
    [queryClient],
  );
}

/**
 * A report as it reads on screen - every figure already formatted - mailed to
 * the owner. The server picks the address itself, so it can reach no other.
 */
export type EmailReport = {
  title: string;
  period: string;
  summary: { label: string; value: string }[];
  tables: { title: string; columns: string[]; rows: string[][] }[];
};

export const emailReport = (report: EmailReport) => http.post<{ sent: boolean; email: string }>('/reports/email', report);
