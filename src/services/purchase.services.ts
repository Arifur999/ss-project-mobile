import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import { INVENTORY_KEY } from '@/services/inventory.services';
import { SUPPLIER_KEY } from '@/services/supplier.services';

// Purchases are read through the Supplier section's query (useSupplierData),
// which already loads every purchase with its lines and receives, the
// suppliers and their payments - the same rows, so the two sections never
// disagree. This file holds the writes.

export type PurchaseLineInput = {
  product_id: string;
  product_code: string;
  product_name: string;
  dp_price: number;
  discount_pct: number;
  actual_dp: number;
  qty: number;
  total_amount: number;
  sp_pct: number;
  sp_amount: number;
  received_qty: number;
};

export type PurchaseInput = {
  si_no: string;
  supplier_id: string;
  supplier_name: string;
  date: string;
  notes: string;
  shipping_status: 'pending' | 'received';
  total_amount: number;
  net_amount: number;
  paid_amount: number;
  due_amount: number;
  items: PurchaseLineInput[];
};

export type ReceiveLineInput = {
  purchase_item_id: string;
  receive_date: string;
  receiver_name: string;
  received_qty: number;
  condition: 'good';
  notes: string;
};

/** One transactional request: the purchase and all its lines. */
export const createPurchase = (input: PurchaseInput) => http.post<{ id: string }>('/purchases', input);

/** Records the receipt, adds the stock and lays down the FIFO cost layer, in one transaction. */
export const receivePurchaseLine = (purchaseId: string, input: ReceiveLineInput) => http.post(`/purchases/${purchaseId}/receive`, input);

/** Every outstanding line at once - either the whole order lands in stock or none of it. */
export const receiveWholePurchase = (purchaseId: string, input: { receive_date: string; receiver_name: string; notes: string }) =>
  http.post(`/purchases/${purchaseId}/receive-all`, input);

/** To the recycle bin, its received stock taken back out - refused once any of it is sold. */
export const deletePurchase = (purchaseId: string) => http.delete(`/purchases/${purchaseId}`);

/** Runs a write, then refetches purchases and suppliers, the stock it moves, and the dashboard's incentive. */
export function usePurchaseWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all([SUPPLIER_KEY, INVENTORY_KEY, ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return result;
    },
    [queryClient],
  );
}
