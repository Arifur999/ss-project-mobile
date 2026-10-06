// Where an expense came from when the shop did not type it in. The website
// writes these rows itself and marks them in the notes:
//   payroll   "SalaryTransaction:<id>\n<Type> payment for <name>\nPeriod: <from> to <to>\n<notes>"
//             (Hatim/src/pages/employees/EmployeeTransactions.tsx)
//   discount  "Automatically generated from Customer Due Discount - <name>", with no account
//             (Hatim/src/pages/customers/CustomerDueReceived.tsx)
// A damage repair or write-off carries damage_entry_id instead.

type Row = Record<string, any>;

export type ExpenseSource =
  | { kind: 'payroll'; payment: string; who: string; from: string; to: string; note: string }
  | { kind: 'discount'; who: string }
  | { kind: 'damage'; note: string }
  | null;

const PAYROLL_MARKER = /^SalaryTransaction:\S+$/;
const DISCOUNT = /^Automatically generated from Customer Due Discount(?: - (.*))?$/;

export function expenseSource(row: Row): ExpenseSource {
  const lines = String(row.notes || '').split('\n').map((line) => line.trim());
  if (PAYROLL_MARKER.test(lines[0] ?? '')) {
    const rest = lines.slice(1).filter(Boolean);
    const paid = rest.find((line) => / payment for /.test(line)) ?? '';
    const period = rest.find((line) => line.startsWith('Period: ')) ?? '';
    const [, from = '', to = ''] = period.match(/^Period: (\S+) to (\S+)$/) ?? [];
    return {
      kind: 'payroll',
      payment: paid.split(' payment for ')[0] ?? '',
      who: paid.split(' payment for ')[1] ?? '',
      from,
      to,
      note: rest.filter((line) => line !== paid && line !== period).join(' '),
    };
  }
  const discount = String(row.notes || '').trim().match(DISCOUNT);
  if (discount) return { kind: 'discount', who: discount[1] ?? '' };
  if (row.damage_entry_id) return { kind: 'damage', note: String(row.notes || '').trim() };
  return null;
}
