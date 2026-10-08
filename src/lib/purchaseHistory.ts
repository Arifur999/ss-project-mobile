import { firstAmount } from './money';
import { inRange, listRange, type ListPeriod } from './periods';
import { actualDp, purchaseDeposit } from './purchaseAmounts';
import { matches } from './search';

// Purchase History's rows, lifted from Hatim/src/pages/purchase/
// PurchaseHistory.tsx (loadHistory and filteredRows): one row per purchase
// line with its DP, discount, actual DP, total, discount and deposit, how much
// of it has arrived and where it stands - searched by product or supplier,
// narrowed by company and date, sorted five ways.
//
// One departure: every purchase is listed. The website reads the latest 500
// and stops there, so an older line could not be found at all.

type Row = Record<string, any>;

export type BoughtItem = {
  id: string;
  purchase_id: string;
  date: string;
  supplier_name: string;
  product_code: string;
  product_name: string;
  dp_price: number;
  discount_pct: number;
  qty: number;
  actual_dp: number;
  total_amount: number;
  sp_amount: number;
  discount_amount: number;
  deposit_amount: number;
  received_qty: number;
  shipping_status: string;
};

export type BoughtState = 'received' | 'partial' | 'pending';

export type BoughtSort = 'date_desc' | 'date_asc' | 'name_asc' | 'amount_desc' | 'amount_asc';
export const BOUGHT_SORTS: BoughtSort[] = ['date_desc', 'date_asc', 'name_asc', 'amount_desc', 'amount_asc'];

/** Every line of every purchase, as Purchase History lists them. */
export function boughtItems(purchases: Row[]): BoughtItem[] {
  return purchases.flatMap((purchase) =>
    (purchase.purchase_items || []).map((item: Row): BoughtItem => {
      const dpPrice = Number(item.dp_price || 0);
      const discountPct = Number(item.discount_pct || 0);
      const qty = Number(item.qty || 0);
      const actual = firstAmount(item.actual_dp, actualDp(dpPrice, discountPct));
      const totalAmount = Number(item.total_amount || actual * qty);
      const spAmount = Number(item.sp_amount || 0);
      const receivedFromHistory = (item.purchase_receives || []).reduce((sum: number, receive: Row) => sum + Number(receive.received_qty || 0), 0);
      return {
        id: String(item.id),
        purchase_id: String(purchase.id),
        date: String(purchase.date || ''),
        supplier_name: purchase.supplier_name || '-',
        product_code: item.product_code || '',
        product_name: item.product_name || '-',
        dp_price: dpPrice,
        discount_pct: discountPct,
        qty,
        actual_dp: actual,
        total_amount: totalAmount,
        sp_amount: spAmount,
        discount_amount: ((dpPrice * discountPct) / 100) * qty,
        deposit_amount: purchaseDeposit(totalAmount, spAmount),
        received_qty: receivedFromHistory || Number(item.received_qty || 0),
        shipping_status: purchase.shipping_status || 'pending',
      };
    }),
  );
}

/** What has not arrived yet. */
export const pendingOf = (row: BoughtItem) => Math.max(0, row.qty - row.received_qty);

/** The page's status: all in is Received; some still due on a part-received order is Partial; else Pending. */
export function boughtState(row: BoughtItem): BoughtState {
  const pending = pendingOf(row);
  if (pending <= 0) return 'received';
  return row.shipping_status === 'partial' ? 'partial' : 'pending';
}

/** Only the companies that appear, so the filter never offers one that shows nothing. */
export function boughtCompanies(items: BoughtItem[]): string[] {
  return [...new Set(items.map((row) => row.supplier_name).filter((name) => name && name !== '-'))].sort((a, b) => a.localeCompare(b));
}

const time = (date: string) => new Date(date).getTime() || 0;

const COMPARE: Record<BoughtSort, (a: BoughtItem, b: BoughtItem) => number> = {
  date_desc: (a, b) => time(b.date) - time(a.date),
  date_asc: (a, b) => time(a.date) - time(b.date),
  name_asc: (a, b) => a.supplier_name.localeCompare(b.supplier_name),
  amount_desc: (a, b) => b.total_amount - a.total_amount,
  amount_asc: (a, b) => a.total_amount - b.total_amount,
};

/** Searched by product, code or supplier, narrowed by company and date, and sorted. */
export function boughtRows(items: BoughtItem[], filter: { search: string; company: string; period: ListPeriod; sort: BoughtSort }): BoughtItem[] {
  const range = listRange(filter.period);
  return items
    .filter(
      (row) =>
        matches(filter.search, row.product_name, row.product_code, row.supplier_name) &&
        (!filter.company || row.supplier_name === filter.company) &&
        inRange(row.date, range),
    )
    .sort(COMPARE[filter.sort]);
}
