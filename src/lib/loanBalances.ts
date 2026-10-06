import { buildLoanSummary, lenderKey, lenderKeyFromLoan, transactionAmounts } from './loans';

// Where a lender's principal stands around one transaction - the figure a loan
// SMS receipt carries. Signed as every loan screen signs it: positive is Pawna
// (they owe us), negative is Dena (we owe them).

type Row = Record<string, any>;

/**
 * Before the transaction being entered, as Hatim's LoanTransactions works it
 * out. The row under edit is left out: its effect is already in `loans`, so
 * counting it would make the preview wrong by twice the amount being changed.
 */
export function balanceBefore(lenders: Row[], loans: Row[], lenderId: string, editingId: string | null): number | null {
  const lender = lenders.find((item) => item.id === lenderId);
  if (!lender) return null;
  const others = editingId ? loans.filter((loan) => loan.id !== editingId) : loans;
  const row = (buildLoanSummary(lenders, others) as Row[]).find((item) => item.key === lenderKey(lender));
  return row ? Number(row.balance || 0) : Number(lender.opening_balance || 0);
}

/**
 * Straight after one saved transaction: the opening balance plus every row of
 * the same lender up to and including it, in the order the statement runs
 * (date, then entry time).
 */
export function balanceAfterRow(lenders: Row[], loans: Row[], target: Row): number {
  const key = lenderKeyFromLoan(target);
  const lender = lenders.find((item) => lenderKey(item) === key);
  const order = (row: Row) => `${String(row.date || '').slice(0, 10)}|${String(row.created_at || '')}`;
  const cutoff = order(target);
  return loans
    .filter((loan) => lenderKeyFromLoan(loan) === key && (loan.id === target.id || order(loan) <= cutoff))
    .reduce((sum, loan) => sum + transactionAmounts(loan).balanceEffect, Number(lender?.opening_balance || 0));
}
