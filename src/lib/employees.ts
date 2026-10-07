import { fromISODate, toISODate } from './dates';

// Employee figures, lifted from Hatim/src/pages/employees/EmployeeDashboard.tsx
// (its totals, each employee's salary and bonus, and the working duration)
// and EmployeeTransactions.tsx (a payment's kind and amount, the days its
// period covers, and the default period).

type Row = Record<string, any>;

export type PayKind = 'Salary' | 'Bonus';

/** A payment's kind as saved, else what its figures say - an old row may carry only a bonus. */
export const payKind = (txn: Row): PayKind => (txn.payment_type === 'Bonus' || (!txn.payment_type && Number(txn.bonus || 0) > 0) ? 'Bonus' : 'Salary');

/** What the payment was worth: its salary or its bonus. */
export const payAmount = (txn: Row) => Number(txn.amount || 0) + Number(txn.bonus || 0);

export type EmployeeTotals = {
  totalEmployees: number;
  activeEmployees: number;
  resignedEmployees: number;
  totalSalary: number;
  totalBonus: number;
  /** Salary and bonus paid, by employee id. */
  byEmployee: Record<string, { salary: number; bonus: number }>;
};

export function employeeTotals(employees: Row[], transactions: Row[]): EmployeeTotals {
  const byEmployee: Record<string, { salary: number; bonus: number }> = {};
  for (const txn of transactions) {
    const paid = (byEmployee[txn.employee_id] ??= { salary: 0, bonus: 0 });
    paid.salary += Number(txn.amount || 0);
    paid.bonus += Number(txn.bonus || 0);
  }
  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((e) => e.is_active).length,
    resignedEmployees: employees.filter((e) => !e.is_active && e.resign_date).length,
    totalSalary: transactions.reduce((s, t) => s + Number(t.amount || 0), 0),
    totalBonus: transactions.reduce((s, t) => s + Number(t.bonus || 0), 0),
    byEmployee,
  };
}

/** How long someone has worked, as the website counts it: thirty-day months and the days over. */
export function workingDuration(employee: Row, now = new Date()): { months: number; days: number } | null {
  const join = fromISODate(String(employee.join_date || '').slice(0, 10));
  if (!join) return null;
  const end = (employee.resign_date && fromISODate(String(employee.resign_date).slice(0, 10))) || now;
  const days = Math.max(0, Math.floor((end.getTime() - join.getTime()) / 86_400_000));
  return { months: Math.floor(days / 30), days: days % 30 };
}

/** The days a payment's period covers, both ends counted; null for an old row without one. */
export function periodDays(txn: Row): number | null {
  const from = fromISODate(String(txn.period_from || '').slice(0, 10));
  const to = fromISODate(String(txn.period_to || '').slice(0, 10));
  if (!from || !to) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

/** This month, the period a new payment starts with. */
export function defaultPayPeriod(now = new Date()) {
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}
