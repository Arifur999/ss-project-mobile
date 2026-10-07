import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Account } from '@/lib/balance';
import type { DamageAction, DamageReceiveResult, DamageSource, DamageStatus } from '@/lib/damageRules';
import { http } from '@/lib/httpClient';
import { fetchList, fetchListOrDenied } from '@/services/list.services';

type Row = Record<string, any>;

export type DamageReceive = {
  id: string;
  receive_date: string;
  receiver_name: string;
  received_qty: number;
  result: DamageReceiveResult;
  notes: string;
};

export type DamageItem = {
  id: string;
  product_id: string | null;
  product_code: string;
  product_name: string;
  qty: number;
  /** The FIFO cost of the stock that left, not the product's list DP. */
  unit_cost: number | string;
  total_cost: number | string;
  received_qty: number;
  damage_receives: DamageReceive[];
};

export type DamageEntry = {
  id: string;
  doc_no: string;
  date: string;
  source: DamageSource;
  action: DamageAction;
  supplier_id: string | null;
  supplier_name: string;
  status: DamageStatus;
  notes: string;
  created_at: string;
  damage_items: DamageItem[];
};

/** A repair paid out (an expense) or a refund from the supplier (other income), tied to its entry. */
export type DamageMoney = {
  id: string;
  date: string;
  direction: 'out' | 'in';
  label: string;
  amount: number;
  account_id: string | null;
  account_name: string;
  entry_id: string;
  notes: string;
};

export type DamageData = {
  entries: DamageEntry[];
  money: DamageMoney[];
  accounts: Account[];
  /** Active employees' names, for "Received by"; empty when the user may not read them. */
  employees: string[];
};

const moneyRow = (raw: Row, direction: 'out' | 'in'): DamageMoney => ({
  id: String(raw.id),
  date: String(raw.date || '').slice(0, 10),
  direction,
  label: direction === 'out' ? String(raw.category_name || '') : String(raw.source_name || ''),
  amount: Number(raw.amount || 0),
  account_id: raw.account_id ?? null,
  account_name: String(raw.account_name || ''),
  entry_id: String(raw.damage_entry_id || ''),
  notes: String(raw.notes || ''),
});

/** Everything the four Damage screens read, fetched once and shared - the website's damage pages' loads. */
export async function loadDamageData(): Promise<DamageData> {
  const [entries, transactions, accounts, employees] = await Promise.all([
    http.get<DamageEntry[]>('/damage'),
    http.get<{ expenses: Row[]; other_incomes: Row[] }>('/damage/transactions'),
    fetchList('/accounts'),
    fetchListOrDenied('/employees'),
  ]);
  const money = [
    ...(transactions?.expenses ?? []).map((raw) => moneyRow(raw, 'out')),
    ...(transactions?.other_incomes ?? []).map((raw) => moneyRow(raw, 'in')),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return {
    entries: entries ?? [],
    money,
    accounts: accounts
      .filter((a) => a.is_active !== false)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) as Account[],
    employees: [...new Set(employees.rows.filter((e) => e.is_active !== false).map((e) => String(e.name || '').trim()).filter(Boolean))],
  };
}

export const DAMAGE_KEY = ['damage'] as const;

export function useDamageData() {
  return useQuery({ queryKey: DAMAGE_KEY, queryFn: loadDamageData });
}

export type DamageEntryInput = {
  date: string;
  source: DamageSource;
  action: DamageAction;
  supplier_id: string | null;
  supplier_name: string;
  notes: string;
  /** unit_cost left out: the server draws the real FIFO cost. */
  items: { product_id: string; product_code: string; product_name: string; qty: number; unit_cost?: number }[];
};

export type ReceiveInput = {
  damage_item_id: string;
  receive_date: string;
  receiver_name: string;
  received_qty: number;
  result: DamageReceiveResult;
  notes: string;
};

export type DamageMoneyInput = {
  kind: 'repair_cost' | 'supplier_refund';
  date: string;
  amount: number;
  account_id: string;
  account_name: string;
  notes: string;
};

export const createDamageEntry = (input: DamageEntryInput) => http.post<DamageEntry>('/damage', input);
export const receiveDamageItem = (entryId: string, input: ReceiveInput) => http.post<DamageEntry>(`/damage/${entryId}/receive`, input);
export const deleteDamageEntry = (entryId: string) => http.delete(`/damage/${entryId}`);
export const addDamageMoney = (entryId: string, input: DamageMoneyInput) => http.post(`/damage/${entryId}/transactions`, input);

/**
 * Runs a write, then refetches the damage data and everything damage moves:
 * stock and its value, and - through the repair expenses, refunds and
 * write-offs - expenses, balances, the dashboard and shareholder profit.
 */
export function useDamageWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [DAMAGE_KEY, ['inventory'], ['expenses'], ['balance'], ['dashboard'], ['shareholders']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      return result;
    },
    [queryClient],
  );
}
