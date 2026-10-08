import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import type { Category } from '@/services/expenses.services';
import { activeAccounts, fetchList, fetchListOrDenied } from '@/services/list.services';

type Row = Record<string, any>;

export type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  opening_due?: number | string | null;
  is_active?: boolean | null;
};

export type CustomerData = {
  /** By name, as the website lists them. */
  customers: Customer[];
  /** Completed sales only, with their lines, payments and deliveries - the ones every customer figure counts, and the Sales tab's invoices. */
  sales: Row[];
  payments: Row[];
  accounts: Account[];
  /** The expense categories a due discount can be booked under; empty when the user may not read them. */
  categories: Category[];
  /** Who can take a collection: the active employees' names, else every employee's, as the website offers them. */
  receivers: string[];
};

/** Everything the Customers and Sales screens read, fetched once and shared - the website's customer and sales pages' loads. */
export async function loadCustomerData(): Promise<CustomerData> {
  const [customers, sales, payments, accounts, categories, employees] = await Promise.all([
    fetchList('/customers'),
    fetchListOrDenied('/sales'),
    fetchListOrDenied('/customer-payments'),
    fetchListOrDenied('/accounts'),
    fetchListOrDenied('/expense-categories'),
    fetchListOrDenied('/employees'),
  ]);
  const active = employees.rows.filter((e) => e.is_active !== false && !e.resign_date);
  return {
    customers: [...customers].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) as Customer[],
    sales: sales.rows.filter((sale) => sale.status === 'completed'),
    payments: payments.rows,
    accounts: activeAccounts(accounts.rows),
    categories: categories.rows
      .filter((c) => c.is_active !== false)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) as Category[],
    receivers: [...new Set((active.length ? active : employees.rows).map((e) => String(e.name || '').trim()).filter(Boolean))],
  };
}

export const CUSTOMER_KEY = ['customer-section'] as const;

export function useCustomerData() {
  return useQuery({ queryKey: CUSTOMER_KEY, queryFn: loadCustomerData });
}

export type CustomerInput = { name: string; phone: string; email: string; address: string; opening_due: number };

export type CustomerPaymentInput = {
  date: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes: string;
};

export const createCustomer = (input: CustomerInput) => http.post<Customer>('/customers', input);
export const updateCustomer = (id: string, input: CustomerInput) => http.patch<Customer>(`/customers/${id}`, input);
/** Refused by the server while the customer has any sale or payment. */
export const deleteCustomer = (id: string) => http.delete(`/customers/${id}`);

/** One row per account a collection went into. */
export const createCustomerPayment = (input: CustomerPaymentInput) => http.post('/customer-payments', input);
/** One collection's own row, changed in place; a linked invoice's paid and due follow its amount on the server. */
export const updateCustomerPayment = (id: string, input: CustomerPaymentInput) => http.patch(`/customer-payments/${id}`, input);
export const deleteCustomerPayment = (id: string) => http.delete(`/customer-payments/${id}`);

/**
 * Runs a write, then refetches the customer data and everything else a
 * collection moves - account balances, the dashboard's collections and top
 * customers, and the expenses a due discount is booked as.
 */
export function useCustomerWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [CUSTOMER_KEY, ['balance'], ['dashboard'], ['expenses'], ['shareholders']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      return result;
    },
    [queryClient],
  );
}
