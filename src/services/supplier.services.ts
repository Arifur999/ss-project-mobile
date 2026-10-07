import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { fetchList } from '@/services/list.services';

type Row = Record<string, any>;

export type SupplierRecord = {
  id: string;
  name: string;
  company_name?: string | null;
  person_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** A magnitude; due_type carries the direction. */
  opening_due?: number | string | null;
  /** 'pawna' - they owe us; anything else ('dena') - we owe them. */
  due_type?: string | null;
  is_active?: boolean | null;
};

export type SupplierPayment = {
  id: string;
  date: string;
  supplier_id: string;
  supplier_name: string;
  purchase_id?: string | null;
  purchase_si_no?: string | null;
  amount: number | string;
  account_id: string;
  account_name: string;
  notes?: string | null;
  created_at?: string;
};

export type OtherIncome = {
  id: string;
  date: string;
  income_type: 'supplier' | 'other';
  supplier_id: string | null;
  supplier_name: string;
  source_name: string;
  amount: number | string;
  account_id: string | null;
  account_name: string;
  notes: string;
};

export type SupplierData = {
  suppliers: SupplierRecord[];
  /** With their lines, for the balances. */
  purchases: Row[];
  payments: SupplierPayment[];
  incomes: OtherIncome[];
  accounts: Account[];
};

/** How the website names a supplier: the company, else the name. */
export const supplierLabel = (s: { name?: unknown; company_name?: unknown } | null | undefined) =>
  String(s?.company_name || s?.name || '').trim();

const newestFirst = (a: Row, b: Row) =>
  String(b.date || '').localeCompare(String(a.date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || ''));

/** Everything the Supplier and Purchase screens read, fetched once and shared - the website's supplier pages' loads. */
export async function loadSupplierData(): Promise<SupplierData> {
  const [suppliers, purchases, payments, incomes, accounts] = await Promise.all([
    fetchList('/suppliers'),
    fetchList('/purchases'),
    fetchList('/supplier-payments'),
    fetchList('/other-incomes'),
    fetchList('/accounts'),
  ]);
  return {
    suppliers: [...suppliers].sort((a, b) => supplierLabel(a as SupplierRecord).localeCompare(supplierLabel(b as SupplierRecord))) as SupplierRecord[],
    purchases,
    payments: [...payments].sort(newestFirst) as SupplierPayment[],
    incomes: [...incomes].sort(newestFirst) as OtherIncome[],
    accounts: accounts
      .filter((a) => a.is_active !== false)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) as Account[],
  };
}

export const SUPPLIER_KEY = ['supplier-section'] as const;

export function useSupplierData() {
  return useQuery({ queryKey: SUPPLIER_KEY, queryFn: loadSupplierData });
}

export type SupplierInput = {
  name: string;
  company_name: string;
  person_name: string;
  phone: string;
  email: string;
  address: string;
  opening_due: number;
  due_type: 'pawna' | 'dena';
};

export type PaymentInput = {
  date: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes: string;
};

export type OtherIncomeInput = {
  date: string;
  income_type: 'supplier' | 'other';
  supplier_id: string | null;
  supplier_name: string;
  source_name: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes: string;
};

export const createSupplier = (input: SupplierInput) => http.post('/suppliers', input);
export const updateSupplier = (id: string, input: SupplierInput) => http.patch(`/suppliers/${id}`, input);
export const deleteSupplier = (id: string) => http.delete(`/suppliers/${id}`);

export const createPayment = (input: PaymentInput) => http.post('/supplier-payments', input);
export const updatePayment = (id: string, input: PaymentInput) => http.patch(`/supplier-payments/${id}`, input);
export const deletePayment = (id: string) => http.delete(`/supplier-payments/${id}`);

export const createOtherIncome = (input: OtherIncomeInput) => http.post('/other-incomes', input);
export const updateOtherIncome = (id: string, input: OtherIncomeInput) => http.patch(`/other-incomes/${id}`, input);
export const deleteOtherIncome = (id: string) => http.delete(`/other-incomes/${id}`);

/**
 * Runs a write, then refetches the supplier data and everything else the
 * same money or names appear in: balances and the dashboard, shareholder
 * profit (other income counts), the supplier pickers of the product and
 * damage forms, and the loan screens' income sources.
 */
export function useSupplierWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [SUPPLIER_KEY, ['suppliers'], ['products'], ['balance'], ['dashboard'], ['shareholders'], ['loans'], ['damage']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      return result;
    },
    [queryClient],
  );
}
