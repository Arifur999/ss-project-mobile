import { useQuery } from '@tanstack/react-query';

import { buildAccountRows, countedSalePayments, type Account, type AccountRow, type BalanceSources } from '@/lib/balance';
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
