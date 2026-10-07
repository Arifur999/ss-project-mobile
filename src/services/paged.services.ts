import { keepPreviousData, useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

import { api, type ApiEnvelope } from '@/lib/httpClient';

// Lists too long to fetch whole - the product catalogue, the stock list - come
// a page at a time, as the website's usePagedList reads them: ?page=&limit=,
// with the number of matching rows in the envelope's meta.total.

/** The website's page size for these lists. */
export const PAGE_SIZE = 40;

export type Page<T> = { rows: T[]; total: number };

type Query = Record<string, string | number | undefined>;

/** One page of a paged endpoint: its payload as sent, and how many rows match in all. */
export async function getPage(endpoint: string, query: Query): Promise<{ data: unknown; total: number }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const res = await api.get<ApiEnvelope<unknown>>(`${endpoint}?${params.toString()}`);
  return { data: res.data.data, total: Number(res.data.meta?.total ?? 0) };
}

/**
 * An infinite list over `fetchPage(page)`: the next page is asked for only
 * while fewer rows are loaded than the server says match. While a new search
 * or filter loads, the previous results stay on screen instead of blanking to
 * a spinner at every pause in typing.
 */
export function usePagedQuery<P extends Page<unknown>>(queryKey: QueryKey, fetchPage: (page: number) => Promise<P>) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.rows.length, 0);
      return last.rows.length > 0 && loaded < last.total ? pages.length + 1 : undefined;
    },
  });
}

/** Every row loaded so far, in order, without a row twice if the list shifted between pages. */
export function pagedRows<T extends { id: string }>(pages: Page<T>[] | undefined): T[] {
  const seen = new Set<string>();
  const rows: T[] = [];
  for (const page of pages ?? []) {
    for (const row of page.rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  return rows;
}
