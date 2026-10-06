import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { fetchList } from '@/services/list.services';

type Row = Record<string, any>;

export type Category = {
  id: string;
  name: string;
  /** A hex from the website's ten presets, lower case: "#ef4444". */
  color?: string | null;
  /** Per month; the yearly allowance is twelve of them. */
  monthly_budget?: number | null;
};

export type ExpenseData = {
  /** Newest first, as the server orders them. */
  expenses: Row[];
  categories: Category[];
  /** Active accounts only, in the order the Balance screens show them. */
  accounts: Account[];
};

/** Everything the two Expense screens read, fetched once and shared. */
export async function loadExpenseData(): Promise<ExpenseData> {
  const [expenses, categories, accounts] = await Promise.all([
    fetchList('/expenses'),
    fetchList('/expense-categories'),
    fetchList('/accounts'),
  ]);
  return {
    expenses,
    categories: [...categories].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) as Category[],
    accounts: accounts
      .filter((a) => a.is_active !== false)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) as Account[],
  };
}

export const EXPENSES_KEY = ['expenses'] as const;

export function useExpenseData() {
  return useQuery({ queryKey: EXPENSES_KEY, queryFn: loadExpenseData });
}

export type CategoryInput = { name: string; color: string; monthly_budget: number };

export type ExpenseInput = {
  date: string;
  category_id: string;
  category_name: string;
  amount: number;
  account_id: string | null;
  account_name: string;
  notes: string;
};

export const createCategory = (input: CategoryInput) => http.post<Category>('/expense-categories', input);
export const updateCategory = (id: string, input: CategoryInput) => http.patch<Category>(`/expense-categories/${id}`, input);
export const deleteCategory = (id: string) => http.delete(`/expense-categories/${id}`);

export const createExpense = (input: ExpenseInput) => http.post('/expenses', input);
export const updateExpense = (id: string, input: ExpenseInput) => http.patch(`/expenses/${id}`, input);
export const deleteExpense = (id: string) => http.delete(`/expenses/${id}`);

/**
 * Runs a write, then refetches the expense data and everything else an
 * expense moves - account balances, the dashboard, shareholder profit, and
 * the loan screens' category list.
 */
export function useExpenseWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [EXPENSES_KEY, ['balance'], ['dashboard'], ['shareholders'], ['loans']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      return result;
    },
    [queryClient],
  );
}
