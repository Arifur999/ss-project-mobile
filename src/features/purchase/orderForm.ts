import { parseAmount, roundTaka } from '@/lib/money';
import { orderTotals, repriceLine, type OrderLine } from '@/lib/purchaseOrder';
import type { Product } from '@/services/products.services';
import type { PurchaseInput } from '@/services/purchase.services';

// The new-purchase form as typed, and what saving it checks: what POST
// /purchases requires (hatim_Backend purchase.validation.ts) plus what the
// website's save() refuses - a supplier, an SI no, at least one product, each
// with a whole quantity above zero and a DP above zero - and percentages kept
// to 0-100. Pure, so testable.

/** One product on the order, its three figures as typed. Lines are added by picking a product, so each has one. */
export type DraftLine = { product_id: string; product_code: string; product_name: string; qty: string; dp: string; discount: string };

export type OrderStatus = 'pending' | 'received';

export type OrderForm = {
  si_no: string;
  supplier_id: string;
  date: string;
  shipping_status: OrderStatus;
  /** The SP percentage for the whole order. */
  sp: string;
  notes: string;
  lines: DraftLine[];
};

export type LineErrors = { qty?: true; dp?: true; discount?: true };

export type OrderFormErrors = {
  supplier?: true;
  siNo?: true;
  items?: true;
  percent?: true;
  /** By product id: which of a line's figures is wrong. */
  lines: Record<string, LineErrors>;
};

/** A blank percentage is none. */
const typedPercent = (typed: string) => (typed.trim() === '' ? 0 : parseAmount(typed));
const isPercent = (n: number) => n >= 0 && n <= 100;
/** What cannot be read yet counts as 0, so the figures follow the typing. */
const figure = (typed: string) => {
  const n = parseAmount(typed);
  return Number.isFinite(n) ? n : 0;
};

/** A product's line as the website's addProductToOrder starts it: its DP rate and DP discount, one piece. */
export function draftForProduct(product: Product): DraftLine {
  return {
    product_id: product.id,
    product_code: product.product_code || '',
    product_name: product.name || '',
    qty: '1',
    dp: String(roundTaka(product.cost_price)),
    discount: String(Number(product.dp_discount) || 0),
  };
}

/** Adds a product - or, already on the order, one more of it, as the website does rather than a second line. */
export function withProduct(lines: DraftLine[], product: Product): DraftLine[] {
  if (!lines.some((line) => line.product_id === product.id)) return [...lines, draftForProduct(product)];
  return lines.map((line) => {
    if (line.product_id !== product.id) return line;
    const qty = parseAmount(line.qty);
    return { ...line, qty: String((Number.isInteger(qty) ? qty : 0) + 1) };
  });
}

/** The percentage the figures use: one out of range is shown as an error and, like the website's clamp, priced at the nearest end. */
export const spPercentOf = (typed: string) => Math.max(0, Math.min(100, figure(typed)));

/** Every line priced the website's way, at the order's SP percentage. */
export function pricedLines(form: OrderForm): OrderLine[] {
  const percent = spPercentOf(form.sp);
  return form.lines.map((line) =>
    repriceLine(
      {
        product_id: line.product_id,
        product_code: line.product_code,
        product_name: line.product_name,
        dp_price: figure(line.dp),
        discount_pct: figure(line.discount),
        actual_dp: 0,
        qty: figure(line.qty),
        total_amount: 0,
        sp_amount: 0,
        deposit_amount: 0,
      },
      percent,
    ),
  );
}

export function orderFormErrors(form: OrderForm): OrderFormErrors {
  const errors: OrderFormErrors = { lines: {} };
  if (!form.supplier_id) errors.supplier = true;
  if (!form.si_no.trim()) errors.siNo = true;
  if (form.lines.length === 0) errors.items = true;
  if (!isPercent(typedPercent(form.sp))) errors.percent = true;
  for (const line of form.lines) {
    const qty = parseAmount(line.qty);
    const wrong: LineErrors = {};
    if (!Number.isInteger(qty) || qty <= 0) wrong.qty = true;
    if (!(parseAmount(line.dp) > 0)) wrong.dp = true;
    if (!isPercent(typedPercent(line.discount))) wrong.discount = true;
    if (wrong.qty || wrong.dp || wrong.discount) errors.lines[line.product_id] = wrong;
  }
  return errors;
}

/**
 * The payload, field for field what the website's save() sends: nothing paid
 * on the bill, the whole total due, every line at the order's SP percentage
 * and nothing received yet - receiving goes through receive-all afterwards,
 * which is what adds the stock and its FIFO cost.
 */
export function orderInput(form: OrderForm, supplierName: string): PurchaseInput {
  const percent = spPercentOf(form.sp);
  const lines = pricedLines(form);
  const { totalAmount } = orderTotals(lines);
  return {
    si_no: form.si_no.trim(),
    supplier_id: form.supplier_id,
    supplier_name: supplierName,
    date: form.date,
    notes: form.notes.trim(),
    shipping_status: form.shipping_status,
    total_amount: totalAmount,
    net_amount: totalAmount,
    paid_amount: 0,
    due_amount: totalAmount,
    items: lines.map((line) => ({
      product_id: line.product_id,
      product_code: line.product_code,
      product_name: line.product_name,
      dp_price: line.dp_price,
      discount_pct: line.discount_pct,
      actual_dp: line.actual_dp,
      qty: line.qty,
      total_amount: line.total_amount,
      sp_pct: percent,
      sp_amount: line.sp_amount,
      received_qty: 0,
    })),
  };
}
