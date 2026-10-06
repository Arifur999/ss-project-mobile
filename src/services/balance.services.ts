import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { buildAccountRows, countedSalePayments, type Account, type AccountRow, type BalanceSources } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { fetchList } from '@/services/list.services';

export type BalanceData = {
  accounts: Account[];
  rows: AccountRow[];
  sources: BalanceSources;
};

/**
 * The eleven reads the website's Balance page makes, once, shared by all four
 * Balance screens: the overview folds them per account, the ledger lays one
 * account's share out as rows, the transfer list and wallet read their parts.
 */
export async function loadBalance(): Promise<BalanceData> {
  const [accounts, investments, profitWithdrawals, loans, transfers, expenses, sales, salePayments, customerPayments, supplierPayments, otherIncomes] =
    await Promise.all([
      fetchList('/accounts'),
      fetchList('/investments'),
      fetchList('/profit-withdrawals'),
      fetchList('/loans'),
      fetchList('/account-transfers'),
      fetchList('/expenses'),
      fetchList('/sales'),
      fetchList('/sale-payments'),
      fetchList('/customer-payments'),
      fetchList('/supplier-payments'),
      fetchList('/other-incomes'),
    ]);

  const sorted = [...accounts].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) as Account[];
  const completedSales = sales.filter((s) => s.status === 'completed');
  const sources: BalanceSources = {
    investments,
    profitWithdrawals,
    loans,
    transfers,
    expenses,
    sales: completedSales,
    salePayments: countedSalePayments(salePayments, completedSales),
    customerPayments,
    supplierPayments,
    otherIncomes,
  };
  return { accounts: sorted, rows: buildAccountRows(sorted, sources), sources };
}

export const BALANCE_KEY = ['balance'] as const;

export function useBalance() {
  return useQuery({ queryKey: BALANCE_KEY, queryFn: loadBalance });
}

export type AccountInput = { name: string; opening_balance: number };

export type TransferInput = {
  date: string;
  from_account_id: string;
  from_account_name: string;
  to_account_id: string;
  to_account_name: string;
  amount: number;
  notes: string;
};

// New accounts are cash accounts, as the website's Wallet creates them; the
// type only matters to reports, and the owner can change it on the site.
export const createAccount = (input: AccountInput) =>
  http.post('/accounts', { ...input, type: 'cash', is_active: true });

export const updateAccount = (id: string, input: Partial<AccountInput> & { is_active?: boolean }) =>
  http.patch(`/accounts/${id}`, input);

export const deleteAccount = (id: string) => http.delete(`/accounts/${id}`);

export const createTransfer = (input: TransferInput) => http.post('/account-transfers', input);

export const updateTransfer = (id: string, input: TransferInput) => http.patch(`/account-transfers/${id}`, input);

export const deleteTransfer = (id: string) => http.delete(`/account-transfers/${id}`);

/**
 * Runs a write and refetches the Balance data, so every Balance screen (and
 * the dashboard, whose cards read the same tables) shows the change.
 */
export function useBalanceWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: BALANCE_KEY }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      return result;
    },
    [queryClient],
  );
}
