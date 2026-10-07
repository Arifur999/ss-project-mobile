import { docNumber } from './docNumber';
import { roundTaka } from './money';
import { actualDp, purchaseDeposit, purchaseItemDeposit, spAmountFor } from './purchaseAmounts';

// A purchase order's lines and totals, lifted from Hatim/src/pages/purchase/
// PurchaseOrders.tsx (applySpPercent, updateItem and the totals under the
// form) and PurchaseLedger.tsx (invoiceMetrics), so an order placed from the
// app is priced exactly as the website prices it.

type Row = Record<string, any>;

export type OrderLine = {
  product_id: string;
  product_code: string;
  product_name: string;
  dp_price: number;
  discount_pct: number;
  actual_dp: number;
  qty: number;
  total_amount: number;
  sp_amount: number;
  deposit_amount: number;
};

/** "PO-2610-4821": the website's generateSINo. */
export const generateSINo = (now = new Date()) => docNumber('PO', now);

/** The incentive on a line from the order's one SP percentage - always derived, never typed. */
export function applySpPercent(line: OrderLine, percent: number): OrderLine {
  const spAmount = spAmountFor(line.total_amount, percent);
  return { ...line, sp_amount: spAmount, deposit_amount: purchaseDeposit(line.total_amount, spAmount) };
}

/** A line re-priced after its DP, discount or quantity changed. */
export function repriceLine(line: OrderLine, percent: number): OrderLine {
  const actual = actualDp(line.dp_price, line.discount_pct);
  return applySpPercent({ ...line, actual_dp: actual, total_amount: roundTaka(actual * line.qty) }, percent);
}

/** The order's totals, as the form shows them. */
export function orderTotals(lines: OrderLine[]) {
  const totalAmount = lines.reduce((s, l) => s + l.total_amount, 0);
  const grossSubtotal = lines.reduce((s, l) => s + Number(l.dp_price || 0) * Number(l.qty || 0), 0);
  return {
    grossSubtotal,
    discountAmount: Math.max(0, grossSubtotal - totalAmount),
    totalAmount,
    totalSp: lines.reduce((s, l) => s + Number(l.sp_amount || 0), 0),
    totalDeposit: lines.reduce((s, l) => s + Number(l.deposit_amount || 0), 0),
  };
}

/** A saved invoice's figures - the Purchase Ledger's columns. Its grand total is the deposit. */
export function invoiceMetrics(purchase: Row) {
  const items: Row[] = purchase.purchase_items || [];
  const deposit = items.reduce((sum, item) => sum + purchaseItemDeposit(item), 0);
  return {
    quantity: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    totalDpAmount: items.reduce((sum, item) => sum + Number(item.dp_price || 0) * Number(item.qty || 0), 0),
    discountAmount: items.reduce((sum, item) => sum + ((Number(item.dp_price || 0) * Number(item.discount_pct || 0)) / 100) * Number(item.qty || 0), 0),
    specialDiscountAmount: items.reduce((sum, item) => sum + Number(item.sp_amount || 0), 0),
    grandTotal: deposit,
  };
}

/** How many of a line have arrived: the sum of its receives, as the Product Received page counts. */
export const receivedOf = (item: Row) => (item.purchase_receives || []).reduce((sum: number, r: Row) => sum + Number(r.received_qty || 0), 0);

export type ReceiveState = 'pending' | 'partial' | 'received';

/** The Product Received page's status for a line. */
export function receiveState(item: Row): ReceiveState {
  const received = receivedOf(item);
  if (Number(item.qty || 0) - received <= 0) return 'received';
  return received > 0 ? 'partial' : 'pending';
}
