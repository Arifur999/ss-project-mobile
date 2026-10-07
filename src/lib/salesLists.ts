import { deliveryStatus, saleAccountDisplay, type DeliveryState } from './saleFigures';
import { inRange, saleRange, type SalePeriod } from './periods';
import { matches } from './search';

// The two sales lists, lifted from Hatim/src/pages/Sales.tsx (filteredSales)
// and SalesHistory.tsx (its rows, search and sorts).

type Row = Record<string, any>;

export type DeliveryFilter = 'all' | DeliveryState;
export const DELIVERY_FILTERS: DeliveryFilter[] = ['all', 'pending', 'partial', 'delivered'];

/** The ledger: searched by customer, invoice, account or phone, by delivery state and by date. `sales` newest first. */
export function ledgerSales(
  sales: Row[],
  accounts: { id: string; name: string }[],
  filter: { search: string; delivery: DeliveryFilter; period: SalePeriod },
): Row[] {
  const range = saleRange(filter.period);
  return sales.filter(
    (s) =>
      matches(filter.search, s.customer_name, s.invoice_no, saleAccountDisplay(s, accounts), s.customer_phone) &&
      (filter.delivery === 'all' || deliveryStatus(s) === filter.delivery) &&
      inRange(s.date || s.created_at, range),
  );
}

export type SoldItem = {
  id: string;
  sale_id: string;
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  product_code: string;
  product_name: string;
  qty: number;
  actual_price: number;
  total_amount: number;
};

export type ItemSort = 'date_desc' | 'date_asc' | 'name_asc' | 'amount_desc' | 'amount_asc';
export const ITEM_SORTS: ItemSort[] = ['date_desc', 'date_asc', 'name_asc', 'amount_desc', 'amount_asc'];

/** Every line of every sale, as Sales History lists them. */
export function soldItems(sales: Row[]): SoldItem[] {
  return sales.flatMap((sale) =>
    (sale.sale_items || []).map((item: Row) => ({
      id: String(item.id),
      sale_id: String(sale.id),
      invoice_no: sale.invoice_no || '-',
      date: String(sale.date || ''),
      customer_name: sale.customer_name || '-',
      customer_phone: sale.customer_phone || '',
      product_code: item.product_code || '',
      product_name: item.product_name || '-',
      qty: Number(item.qty || 0),
      actual_price: Number(item.actual_price || 0),
      total_amount: Number(item.total_amount || 0),
    })),
  );
}

const time = (date: string) => new Date(date).getTime() || 0;

const COMPARE: Record<ItemSort, (a: SoldItem, b: SoldItem) => number> = {
  date_desc: (a, b) => time(b.date) - time(a.date),
  date_asc: (a, b) => time(a.date) - time(b.date),
  // The website sorts its "name" order by the customer.
  name_asc: (a, b) => a.customer_name.localeCompare(b.customer_name),
  amount_desc: (a, b) => b.total_amount - a.total_amount,
  amount_asc: (a, b) => a.total_amount - b.total_amount,
};

/** Searched by product, code, invoice or customer, narrowed by date and sorted. */
export function itemRows(items: SoldItem[], filter: { search: string; period: SalePeriod; sort: ItemSort }): SoldItem[] {
  const range = saleRange(filter.period);
  return items
    .filter((row) => matches(filter.search, row.product_name, row.product_code, row.invoice_no, row.customer_name) && inRange(row.date, range))
    .sort(COMPARE[filter.sort]);
}
