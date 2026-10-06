import type { LenderStatement } from '@/services/loans.services';

/**
 * The statement's figures as the design reads them: paid and received are the
 * PRINCIPAL that moved the balance, and profit each way is set apart - the
 * server's totals count both together.
 */
export function statementFigures(statement: LenderStatement) {
  let paid = 0;
  let received = 0;
  let profitPaid = 0;
  let profitReceived = 0;
  for (const row of statement.rows) {
    if (row.is_profit) {
      profitPaid += Number(row.debit || 0);
      profitReceived += Number(row.credit || 0);
    } else {
      paid += Number(row.debit || 0);
      received += Number(row.credit || 0);
    }
  }
  return {
    opening: Number(statement.opening_principal || 0),
    closing: Number(statement.closing_principal || 0),
    paid,
    received,
    profitPaid,
    profitReceived,
  };
}

export type StatementFigures = ReturnType<typeof statementFigures>;
