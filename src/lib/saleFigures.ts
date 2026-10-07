import { saleDue } from './customerDue';

// A saved sale's figures, lifted from Hatim/src/pages/Sales.tsx (the Sales
// Ledger's saleDiscount, saleGrossTotal, saleProfit, the delivery counts,
// salePaymentRowsForInvoice, previousDueForSale and the invoice's delivery
// charge), so a sale reads the same in the app as on the website.

type Row = Record<string, any>;

/** The discount stored on the sale, else worked out from its lines. */
export function saleDiscount(sale: Row): number {
  const stored = Number(sale.discount_amount || 0);
  return (
    stored ||
    (sale.sale_items || []).reduce(
      (sum: number, item: Row) => sum + (Number(item.selling_price || 0) - Number(item.actual_price || 0)) * Number(item.qty || 0),
      0,
    )
  );
}

/** Every line at its price before discount. */
export function saleGrossTotal(sale: Row): number {
  const itemTotal = (sale.sale_items || []).reduce((sum: number, item: Row) => sum + Number(item.selling_price || 0) * Number(item.qty || 0), 0);
  return itemTotal || Number(sale.subtotal || 0) || Number(sale.net_amount || 0) + saleDiscount(sale);
}

/** What the goods came to - the ledger's amount column and its total. */
export const saleSubtotalAfterDiscount = (sale: Row) => Math.max(0, saleGrossTotal(sale) - saleDiscount(sale));

/** What the goods cost, at the cost recorded on each line. */
export const salePurchaseAmount = (sale: Row) =>
  (sale.sale_items || []).reduce((sum: number, item: Row) => sum + Number(item.cost_price || 0) * Number(item.qty || 0), 0);

/** A line with no cost recorded earns nothing, rather than counting as pure profit. */
export function itemProfit(item: Row): number {
  const costPrice = Number(item.cost_price || 0);
  if (costPrice <= 0) return 0;
  return (Number(item.actual_price || 0) - costPrice) * Number(item.qty || 0);
}

export const saleProfit = (sale: Row) => (sale.sale_items || []).reduce((sum: number, item: Row) => sum + itemProfit(item), 0);

/** Whether any line still waits for a cost, so its profit is not yet counted. */
export const saleHasMissingCost = (sale: Row) => (sale.sale_items || []).some((item: Row) => Number(item.cost_price || 0) <= 0);

/** How many of a line have gone out: its delivery history, else the figure on the line. */
export function deliveredQty(item: Row): number {
  const fromHistory = (item.sale_deliveries || []).reduce((sum: number, delivery: Row) => sum + Number(delivery.delivered_qty || 0), 0);
  return fromHistory || Number(item.delivered_qty || 0);
}

export const pendingQty = (item: Row) => Math.max(0, Number(item.qty || 0) - deliveredQty(item));

export type DeliveryState = 'pending' | 'partial' | 'delivered';

export function deliveryStatus(sale: Row): DeliveryState {
  const items: Row[] = sale.sale_items || [];
  const pending = items.reduce((sum, item) => sum + pendingQty(item), 0);
  const delivered = items.reduce((sum, item) => sum + deliveredQty(item), 0);
  if (pending <= 0) return 'delivered';
  if (delivered > 0) return 'partial';
  return 'pending';
}

/** The accounts a sale was paid into: its split payments, else its one paid amount and account. */
export function salePaymentRows(sale: Row, accounts: { id: string; name: string }[]): { account_name: string; amount: number }[] {
  const nameOf = (id: unknown, fallback: unknown) => accounts.find((a) => a.id === id)?.name || String(fallback ?? '');
  const split = (sale.sale_payments || [])
    .map((payment: Row) => ({ account_name: nameOf(payment.account_id, payment.account_name), amount: Math.max(0, Number(payment.amount || 0)) }))
    .filter((payment: { amount: number }) => payment.amount > 0);
  if (split.length > 0) return split;
  const paid = Math.max(0, Number(sale.paid_amount || 0));
  return paid > 0 ? [{ account_name: nameOf(sale.account_id, sale.account_name), amount: paid }] : [];
}

/** "Cash & bKash" - each account once. */
export function saleAccountDisplay(sale: Row, accounts: { id: string; name: string }[]): string {
  const names = [...new Set(salePaymentRows(sale, accounts).map((p) => p.account_name).filter(Boolean))];
  return names.length > 0 ? names.join(' & ') : String(sale.account_name || '');
}

const entryTime = (entry: Row) => {
  const raw = entry.created_at || entry.date;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

/** Newest first, then by invoice number - the ledger's order. */
export const latestSalesFirst = (sales: Row[]) =>
  [...sales].sort((a, b) => entryTime(b) - entryTime(a) || String(b.invoice_no || '').localeCompare(String(a.invoice_no || '')));

/** What the customer owed before this sale, as its printed invoice shows it - never below zero. */
export function previousDueForSale(sale: Row, sales: Row[], customers: Row[], payments: Row[]): number {
  if (!sale.customer_id) return 0;
  const customer = customers.find((c) => c.id === sale.customer_id);
  const saleTime = entryTime(sale);
  const previousSalesDue = sales
    .filter((s) => s.customer_id === sale.customer_id)
    .filter((s) => s.id !== sale.id && s.invoice_no !== sale.invoice_no)
    .filter((s) => !saleTime || entryTime(s) < saleTime)
    .reduce((sum, s) => sum + saleDue(s), 0);
  const paymentsBefore = payments
    .filter((p) => p.customer_id === sale.customer_id)
    .filter((p) => !saleTime || entryTime(p) < saleTime)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return Math.max(0, Number(customer?.opening_due || 0) + previousSalesDue - paymentsBefore);
}

/** Anything billed beyond the discounted goods - the invoice's delivery charge line. */
export const invoiceDeliveryCharge = (sale: Row) => Math.max(0, Number(sale.net_amount || 0) - (saleGrossTotal(sale) - saleDiscount(sale)));
