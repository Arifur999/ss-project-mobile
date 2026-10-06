import type { AccountLedgerSources } from './accountLedger';
import { saleRemainderForAccount, splitPaymentCoverage, type AccountMovements } from './balanceTabs';

// Each account's movements and current balance, folded from the eleven money
// tables. Lifted line for line from Hatim/src/pages/Balance.tsx loadBalance(),
// so a balance here is the website's balance to the taka. The ledger closes on
// the same figure because it uses the same sources and helpers.

type Row = Record<string, any>;

export type Account = {
  id: string;
  name: string;
  type?: string;
  opening_balance: number;
  is_active: boolean;
  sort_order?: number;
};

export type AccountRow = AccountMovements & { id: string; name: string; type: string; is_active: boolean };

export type BalanceSources = AccountLedgerSources;

/**
 * Sale payments that still count: payments of a sale that is no longer
 * completed drop out with the sale; a payment with no sale at all stays, as
 * it is still money that landed in an account.
 */
export function countedSalePayments(salePayments: Row[], completedSales: Row[]): Row[] {
  const completed = new Set(completedSales.map((s) => String(s.id)));
  return salePayments.filter((p) => !p.sale_id || completed.has(p.sale_id));
}

export function buildAccountRows(accounts: Account[], s: BalanceSources): AccountRow[] {
  const sumBy = (rows: Row[], accountId: string, field: string) =>
    rows.filter((r) => r.account_id === accountId).reduce((sum, r) => sum + Number(r[field] || 0), 0);
  const covered = splitPaymentCoverage(s.salePayments, new Set(s.sales.map((sale) => String(sale.id))));

  return accounts.map((acc) => {
    const total_invest = sumBy(s.investments, acc.id, 'invest_amount');
    const invest_withdraw = sumBy(s.investments, acc.id, 'withdraw_amount');
    const profit_withdraw = sumBy(s.profitWithdrawals, acc.id, 'amount');
    const loan_received = sumBy(s.loans, acc.id, 'received_amount');
    const loan_payment = sumBy(s.loans, acc.id, 'payment_amount');
    const supplier_payment = sumBy(s.supplierPayments, acc.id, 'amount');
    const legacyCashSales = s.sales
      .filter((r) => r.account_id === acc.id)
      .reduce((sum, r) => sum + saleRemainderForAccount(r as { id: string; paid_amount?: unknown }, covered), 0);
    const cash_sales = legacyCashSales + sumBy(s.salePayments, acc.id, 'amount');
    const customer_due_received = sumBy(s.customerPayments, acc.id, 'amount');
    const other_income = sumBy(s.otherIncomes, acc.id, 'amount');
    const expense_pay = sumBy(s.expenses, acc.id, 'amount');
    const transfer_in = s.transfers.filter((r) => r.to_account_id === acc.id).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const transfer_out = s.transfers.filter((r) => r.from_account_id === acc.id).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const current_balance =
      Number(acc.opening_balance) + total_invest - invest_withdraw - profit_withdraw + loan_received - loan_payment -
      supplier_payment + cash_sales + customer_due_received + other_income - expense_pay + transfer_in - transfer_out;

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type ?? 'cash',
      opening_balance: Number(acc.opening_balance) || 0,
      is_active: acc.is_active !== false,
      total_invest,
      invest_withdraw,
      profit_withdraw,
      loan_received,
      loan_payment,
      supplier_payment,
      cash_sales,
      customer_due_received,
      other_income,
      expense_pay,
      transfer_in,
      transfer_out,
      current_balance,
    };
  });
}

/** Closed accounts sink below the live ones, each group keeping its sort order. */
export const activeFirst = <T extends { is_active: boolean }>(rows: T[]) =>
  [...rows].sort((a, b) => Number(!a.is_active) - Number(!b.is_active));
