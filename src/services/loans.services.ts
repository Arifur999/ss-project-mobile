import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { fetchList } from '@/services/list.services';

type Row = Record<string, any>;

export type Lender = {
  id: string;
  name: string;
  lender_type?: 'bank' | 'person' | 'boss' | null;
  phone?: string | null;
  address?: string | null;
  /** Signed: positive is Pawna (they owe us), negative is Dena (we owe them). */
  opening_balance?: number | null;
  opening_date?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
};

export type ExpenseCategory = { id: string; name: string };

export type LoanData = {
  lenders: Lender[];
  loans: Row[];
  /** Active accounts only, in the order the Balance screens show them. */
  accounts: Account[];
  categories: ExpenseCategory[];
  /** Every name Other Income has been filed under, for a profit receipt. */
  incomeSources: string[];
};

/** Everything the four Loan screens read, fetched once and shared. */
export async function loadLoanData(): Promise<LoanData> {
  const [lenders, loans, accounts, categories, otherIncomes] = await Promise.all([
    fetchList('/loan-lenders'),
    fetchList('/loans'),
    fetchList('/accounts'),
    fetchList('/expense-categories'),
    fetchList('/other-incomes'),
  ]);
  const sources = otherIncomes.map((row) => String(row.source_name || '').trim()).filter(Boolean);
  return {
    lenders: [...lenders].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) as Lender[],
    loans,
    accounts: accounts
      .filter((a) => a.is_active !== false)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) as Account[],
    categories: [...categories].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) as ExpenseCategory[],
    incomeSources: [...new Set(sources)].sort((a, b) => a.localeCompare(b)),
  };
}

export const LOANS_KEY = ['loans'] as const;

export function useLoanData() {
  return useQuery({ queryKey: LOANS_KEY, queryFn: loadLoanData });
}

export type LenderInput = {
  name: string;
  phone: string;
  address: string;
  lender_type?: 'bank' | 'person' | 'boss';
  opening_balance: number;
  opening_date: string | null;
  notes: string;
  is_active: boolean;
};

export type LoanInput = {
  date: string;
  lender_id: string | null;
  lender_name: string;
  loan_type: 'bank' | 'personal';
  transaction_type: 'receive' | 'payment';
  payment_category: 'principal' | 'profit';
  expense_category_id: string | null;
  expense_category_name: string;
  income_source_name: string;
  received_amount: number;
  payment_amount: number;
  interest_amount: number;
  account_id: string;
  account_name: string;
  notes: string;
};

export const createLender = (input: LenderInput) => http.post<Lender>('/loan-lenders', input);
export const updateLender = (id: string, input: LenderInput) => http.patch<Lender>(`/loan-lenders/${id}`, input);
export const deleteLender = (id: string) => http.delete(`/loan-lenders/${id}`);

export const createLoan = (input: LoanInput) => http.post('/loans', input);
export const updateLoan = (id: string, input: LoanInput) => http.patch(`/loans/${id}`, input);
export const deleteLoan = (id: string) => http.delete(`/loans/${id}`);

/**
 * Runs a write, then refetches the loan data and everything else the same
 * money appears in - account balances, the dashboard, and the expense and
 * income screens a profit row is mirrored into.
 */
export function useLoanWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [LOANS_KEY, ['loan-statement'], ['balance'], ['dashboard'], ['expenses'], ['shareholders']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      return result;
    },
    [queryClient],
  );
}

/** One row of a lender statement, as the server builds it. */
export type StatementRow = {
  row: Row;
  /** Money out of our pocket. */
  debit: number;
  /** Money into our pocket. */
  credit: number;
  is_profit: boolean;
  /** Unchanged by a profit row, which is what the statement exists to show. */
  running_principal: number;
};

export type LenderStatement = {
  lender: { id: string; name: string; phone: string; address: string; opening_balance: number; key: string };
  from: string | null;
  to: string | null;
  opening_principal: number;
  rows: StatementRow[];
  total_paid: number;
  total_received: number;
  total_profit: number;
  closing_principal: number;
};

/**
 * A passbook for one lender over one window. The server folds everything
 * before the from-date into the opening balance, so the app never downloads a
 * lender's whole history to show one month.
 */
export function getLenderStatement(lenderId: string, from?: string, to?: string) {
  const query = new URLSearchParams({ lender_id: lenderId });
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return http.get<LenderStatement>(`/loans/statement?${query.toString()}`);
}

export function useLenderStatement(lenderId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ['loan-statement', lenderId, from ?? '', to ?? ''],
    queryFn: () => getLenderStatement(lenderId as string, from, to),
    enabled: Boolean(lenderId),
  });
}
