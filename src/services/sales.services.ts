import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import { CUSTOMER_KEY } from '@/services/customers.services';
import { INVENTORY_KEY } from '@/services/inventory.services';

// Sales are read through the Customers tab's query (useCustomerData), which
// already loads every completed sale with its lines, payments and deliveries,
// the customers and their collections - the same rows, so a customer's due
// and a sale's previous due never disagree. This file holds the writes.

type Row = Record<string, any>;

export type SaleLineInput = {
  product_id: string;
  product_code: string;
  product_name: string;
  selling_price: number;
  discount_pct: number;
  actual_price: number;
  qty: number;
  total_amount: number;
  cost_price: number;
  delivered_qty: number;
};

export type SalePaymentInput = { date: string; account_id: string; account_name: string; amount: number };

export type SaleInput = {
  invoice_no: string;
  date: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  account_id: string | null;
  account_name: string;
  subtotal: number;
  discount_amount: number;
  net_amount: number;
  paid_amount: number;
  due_amount: number;
  notes: string;
  status: 'completed';
  items: SaleLineInput[];
  payments: SalePaymentInput[];
};

export type DeliveryInput = { sale_item_id: string; delivery_date: string; delivered_qty: number; delivered_by: string; notes: string };

/**
 * One transactional request: the sale, its lines and payments, the stock going
 * out and its FIFO cost. The server may move the invoice number past one
 * already taken, so the saved sale's number is the one to show.
 */
export const createSale = (input: SaleInput) => http.post<Row>('/sales', input);

/**
 * Rewrites a sale in one transaction: its old lines' stock and FIFO cost go
 * back, the new lines go out, and its payments are replaced. Collections
 * against the customer's old due are their own records and stay as they are.
 */
export const updateSale = (saleId: string, input: SaleInput) => http.put<Row>(`/sales/${saleId}`, input);

/**
 * A sale line's purchase rate set by hand, in one transaction: its FIFO cost
 * layers are released and its pieces taken again at this rate, so its profit
 * is worked out from it.
 */
export const setSaleItemCost = (itemId: string, unitCost: number) => http.post(`/sales/items/${itemId}/manual-cost`, { unit_cost: unitCost });

/** Records a delivery, moves the line's delivered count and the sale's delivery status, in one transaction. */
export const addSaleDelivery = (saleId: string, input: DeliveryInput) => http.post(`/sales/${saleId}/deliveries`, input);

/** To the recycle bin, its stock and FIFO cost put back, in one transaction. */
export const deleteSale = (saleId: string) => http.delete(`/sales/${saleId}`);

/** Runs a write, then refetches sales and customers, the stock they move, balances, the dashboard and profit. */
export function useSaleWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all(
        [CUSTOMER_KEY, INVENTORY_KEY, ['products'], ['balance'], ['dashboard'], ['shareholders']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      return result;
    },
    [queryClient],
  );
}
