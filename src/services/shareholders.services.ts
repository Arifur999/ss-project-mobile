import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { fetchList } from '@/services/list.services';

type Row = Record<string, any>;

export type Shareholder = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  opening_amount?: number | null;
  share_percentage?: number | null;
  sort_order?: number | null;
};

export type ShareholderData = {
  shareholders: Shareholder[];
  investments: Row[];
  profitWithdrawals: Row[];
  sales: Row[];
  expenses: Row[];
  otherIncomes: Row[];
  accounts: Account[];
};

/** Everything the four Shareholder screens read, fetched once and shared. */
export async function loadShareholderData(): Promise<ShareholderData> {
  const [shareholders, investments, profitWithdrawals, sales, expenses, otherIncomes, accounts] = await Promise.all([
    fetchList('/shareholders'),
    fetchList('/investments'),
    fetchList('/profit-withdrawals'),
    fetchList('/sales'),
    fetchList('/expenses'),
    fetchList('/other-incomes'),
    fetchList('/accounts'),
  ]);
  const bySort = (a: Row, b: Row) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  return {
    shareholders: [...shareholders].sort(bySort) as Shareholder[],
    investments,
    profitWithdrawals,
    sales: sales.filter((s) => s.status === 'completed'),
    expenses,
    otherIncomes,
    accounts: [...accounts].sort(bySort) as Account[],
  };
}

export const SHAREHOLDERS_KEY = ['shareholders'] as const;

export function useShareholderData() {
  return useQuery({ queryKey: SHAREHOLDERS_KEY, queryFn: loadShareholderData });
}

export type ShareholderInput = { name: string; phone: string; address: string; opening_amount: number };

export type InvestmentInput = {
  date: string;
  shareholder_id: string;
  shareholder_name: string;
  invest_amount: number;
  withdraw_amount: number;
  account_id: string;
  account_name: string;
  notes: string;
};

export type ProfitWithdrawalInput = {
  date: string;
  shareholder_id: string;
  shareholder_name: string;
  amount: number;
  account_id: string;
  account_name: string;
  profit_month: number;
  profit_year: number;
  to_month: number;
  to_year: number;
  notes: string;
};

export const createShareholder = (input: ShareholderInput) => http.post('/shareholders', input);
export const updateShareholder = (id: string, input: ShareholderInput) => http.patch(`/shareholders/${id}`, input);
export const deleteShareholder = (id: string) => http.delete(`/shareholders/${id}`);

export const createInvestment = (input: InvestmentInput) => http.post('/investments', input);
export const updateInvestment = (id: string, input: InvestmentInput) => http.patch(`/investments/${id}`, input);
export const deleteInvestment = (id: string) => http.delete(`/investments/${id}`);

export const createProfitWithdrawal = (input: ProfitWithdrawalInput) => http.post('/profit-withdrawals', input);
export const updateProfitWithdrawal = (id: string, input: ProfitWithdrawalInput) => http.patch(`/profit-withdrawals/${id}`, input);
export const deleteProfitWithdrawal = (id: string) => http.delete(`/profit-withdrawals/${id}`);

/**
 * Runs a write, then refetches the shareholder data and everything else the
 * same money appears in - account balances and the dashboard.
 */
export function useShareholderWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [SHAREHOLDERS_KEY, ['balance'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      return result;
    },
    [queryClient],
  );
}
