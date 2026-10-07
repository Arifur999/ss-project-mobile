import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { CUSTOMER_KEY } from '@/services/customers.services';
import { createExpense, deleteExpense, type Category } from '@/services/expenses.services';
import { activeAccounts, fetchList, fetchListOrDenied } from '@/services/list.services';

type Row = Record<string, any>;

export type Employee = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  join_date?: string | null;
  resign_date?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
};

export type EmployeeData = {
  /** Newest joiner first, as the website lists them. */
  employees: Employee[];
  /** Salary and bonus payments, newest first; empty when the user may not read them. */
  payments: Row[];
  /** Newest first; empty when the user may not read it. */
  attendance: Row[];
  accounts: Account[];
  /** The expense categories a payment is booked under. */
  categories: Category[];
};

const newestFirst = (a: Row, b: Row) =>
  String(b.date || '').localeCompare(String(a.date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || ''));

/** Everything the four Employees screens read, fetched once and shared - the website's employee pages' loads. */
export async function loadEmployeeData(): Promise<EmployeeData> {
  const [employees, payments, attendance, accounts, categories] = await Promise.all([
    fetchList('/employees'),
    fetchListOrDenied('/salary-transactions'),
    fetchListOrDenied('/attendance'),
    fetchListOrDenied('/accounts'),
    fetchListOrDenied('/expense-categories'),
  ]);
  return {
    employees: [...employees].sort((a, b) => String(b.join_date || '').localeCompare(String(a.join_date || ''))) as Employee[],
    payments: [...payments.rows].sort(newestFirst),
    attendance: [...attendance.rows].sort(newestFirst),
    accounts: activeAccounts(accounts.rows),
    categories: categories.rows
      .filter((c) => c.is_active !== false)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) as Category[],
  };
}

export const EMPLOYEES_KEY = ['employees'] as const;

export function useEmployeeData() {
  return useQuery({ queryKey: EMPLOYEES_KEY, queryFn: loadEmployeeData });
}

export type EmployeeInput = {
  name: string;
  phone: string;
  address: string;
  join_date: string;
  resign_date: null;
  notes: string | null;
  is_active: true;
};

export type ResignInput = { resign_date: string; notes: string | null; is_active: false };

export type SalaryInput = {
  employee_id: string;
  employee_name: string;
  date: string;
  payment_type: 'Salary' | 'Bonus';
  category_id: string;
  category_name: string;
  period_from: string;
  period_to: string;
  account_id: string;
  account_name: string;
  amount: number;
  bonus: number;
  notes: string;
};

export type AttendanceInput = {
  employee_id: string;
  date: string;
  present: boolean;
  start_time: string | null;
  end_time: string | null;
  total_hours: string;
  notes: string;
};

export const createEmployee = (input: EmployeeInput) => http.post<Employee>('/employees', input);
export const updateEmployee = (id: string, input: EmployeeInput | ResignInput) => http.patch<Employee>(`/employees/${id}`, input);
export const deleteEmployee = (id: string) => http.delete(`/employees/${id}`);

/** The website's marker on a payment's expense, the line it is found again by. */
const expenseMarker = (id: string) => `SalaryTransaction:${id}`;

/**
 * A salary or bonus payment and the expense that takes its money out of the
 * account. The server books both in one transaction for the app; a server
 * that predates that books only the payment, so the expense is then written
 * here, the website's way - marker, payment, period, notes.
 */
export async function paySalary(input: SalaryInput): Promise<Row> {
  const saved = await http.post<Row>('/salary-transactions', input);
  if (saved?.expense_id) return saved;
  const expense = await createExpense({
    date: input.date,
    category_id: input.category_id,
    category_name: input.category_name,
    amount: input.amount + input.bonus,
    account_id: input.account_id,
    account_name: input.account_name,
    notes: [
      expenseMarker(String(saved.id)),
      `${input.payment_type} payment for ${input.employee_name}`,
      `Period: ${input.period_from} to ${input.period_to}`,
      input.notes,
    ]
      .filter(Boolean)
      .join('\n'),
  });
  // Linking is a nicety the marker already covers, and not every role may make it.
  await http.patch(`/salary-transactions/${saved.id}`, { expense_id: (expense as Row)?.id }).catch(() => {});
  return saved;
}

/**
 * A payment and its expense gone. The server takes the expense with it for the
 * app; asking again afterwards is a 404 then, and the clean-up an older server
 * needs otherwise.
 */
export async function deleteSalaryPayment(payment: Row): Promise<void> {
  await http.delete(`/salary-transactions/${payment.id}`);
  if (!payment.expense_id) return;
  try {
    await deleteExpense(String(payment.expense_id));
  } catch (e) {
    if (!(isAxiosError(e) && e.response?.status === 404)) throw e;
  }
}

/** One row per employee a day: the server keeps the one already there up to date. */
export const saveAttendance = (input: AttendanceInput) => http.put('/attendance', input);
export const deleteAttendance = (id: string) => http.delete(`/attendance/${id}`);

/**
 * Runs a write, then refetches the employee data and everything a payment or
 * a name moves - balances, expenses, the dashboard, shareholder profit, and
 * the receiver names the customer and damage forms offer.
 */
export function useEmployeeWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [EMPLOYEES_KEY, ['balance'], ['expenses'], ['dashboard'], ['shareholders'], CUSTOMER_KEY, ['damage']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      return result;
    },
    [queryClient],
  );
}
