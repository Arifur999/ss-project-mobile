import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import { getPage, PAGE_SIZE, usePagedQuery, type Page } from '@/services/paged.services';

/**
 * One product's stock, every figure worked out on the server
 * (GET /inventory/list - inventory.service.ts getInventoryList).
 */
export type StockRow = {
  id: string;
  product_id: string;
  opening_qty: number;
  order_qty: number;
  received_qty: number;
  upcoming_qty: number;
  sales_qty: number;
  /** The stock ledger - the figure the Sales page reads. Can be negative: sold before it arrived. */
  available_qty: number;
  /** Opening + received - sold. Differs from available_qty by exactly the manual adjustments. */
  computed_qty: number;
  /** Weighted average cost of the unsold units. */
  fifo_average_dp: number;
  fifo_stock_value: number;
  products: {
    id: string;
    name: string;
    product_code: string;
    image_url?: string | null;
    suppliers?: { name?: string | null; company_name?: string | null } | null;
  } | null;
};

export type StockStatusFilter = 'all' | 'available' | 'out_of_stock' | 'upcoming';

export type StockPage = Page<StockRow> & { totalStockValue: number };

export const INVENTORY_KEY = ['inventory'] as const;

async function fetchStock(search: string, status: StockStatusFilter, page?: number): Promise<StockPage> {
  const { data, total } = await getPage('/inventory/list', {
    page,
    limit: page ? PAGE_SIZE : undefined,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
  });
  const payload = (data ?? {}) as { rows?: StockRow[]; totalStockValue?: number };
  return { rows: payload.rows ?? [], total, totalStockValue: Number(payload.totalStockValue ?? 0) };
}

/** The stock list by product code, searched and filtered by status on the server. */
export function useStock(search: string, status: StockStatusFilter) {
  return usePagedQuery<StockPage>([...INVENTORY_KEY, 'list', search, status], (page) => fetchStock(search, status, page));
}

/**
 * Every matching row at once (no page asked for), for printing: a printout of
 * only the rows scrolled into view would be silently incomplete.
 */
export const getAllStock = (search: string, status: StockStatusFilter) => fetchStock(search, status);

export type StockMovement = {
  id: string;
  change_type: string;
  qty_change: number;
  qty_before: number;
  qty_after: number;
  reference_type: string;
  notes: string;
  created_at: string;
};

/** Every movement of one product's stock, newest first (the server keeps the latest 500). */
export function useStockHistory(productId: string | null) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, 'history', productId],
    queryFn: () => http.get<StockMovement[]>(`/inventory/history?product_id=${encodeURIComponent(productId as string)}`),
    enabled: Boolean(productId),
  });
}

export type AdjustInput = { product_id: string; product_name: string; qty_change: number; notes: string };

/**
 * A manual correction - damage, loss, a stock count. Signed: -5 records that
 * five left. The server moves the level, writes the history row and keeps the
 * FIFO batches in step in one transaction.
 */
export const adjustStock = (input: AdjustInput) => http.post('/inventory/adjust', input);

/** Runs a write, then refetches the stock list and the history it adds to. */
export function useStockWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all([INVENTORY_KEY, ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return result;
    },
    [queryClient],
  );
}
