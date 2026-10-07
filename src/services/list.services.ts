import { isAxiosError } from 'axios';

import type { Account } from '@/lib/balance';
import { http } from '@/lib/httpClient';
import { rangeQuery, type Range } from '@/lib/periods';

type Row = Record<string, any>;

/**
 * Every row of a list endpoint, optionally narrowed by date. The endpoints
 * answer with a plain array unless asked to page; a paged envelope is unwrapped
 * all the same so a server-side change cannot blank a screen.
 */
export async function fetchList(endpoint: string, range: Range | null = null): Promise<Row[]> {
  const data = await http.get<unknown>(`${endpoint}${rangeQuery(range)}`);
  if (Array.isArray(data)) return data as Row[];
  const inner = (data as { data?: unknown } | null)?.data;
  return Array.isArray(inner) ? (inner as Row[]) : [];
}

/**
 * The same, but a 403 reads as "no rows" and is reported, so a team member who
 * may not open one section still sees every figure they may see.
 */
export async function fetchListOrDenied(
  endpoint: string,
  range: Range | null = null,
): Promise<{ rows: Row[]; denied: boolean }> {
  try {
    return { rows: await fetchList(endpoint, range), denied: false };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) return { rows: [], denied: true };
    throw error;
  }
}

/** The accounts a payment can go into: the active ones, in the order the Balance screens show them. */
export const activeAccounts = (rows: Row[]) =>
  rows.filter((a) => a.is_active !== false).sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) as Account[];

/** The smallest range covering all of them. */
export function spanOf(...ranges: Range[]): Range {
  return {
    from: ranges.reduce((min, r) => (r.from < min ? r.from : min), ranges[0].from),
    to: ranges.reduce((max, r) => (r.to > max ? r.to : max), ranges[0].to),
  };
}
