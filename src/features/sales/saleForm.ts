import type { PaymentRow } from '@/components/PaymentRowFields';
import type { Account } from '@/lib/balance';
import { docNumber } from '@/lib/docNumber';
import { parseAmount, roundTaka } from '@/lib/money';
import { isValidBdPhone } from '@/lib/phone';
import { actualDp } from '@/lib/purchaseAmounts';
import { deliveredQty, pendingQty } from '@/lib/saleFigures';
import type { Customer, CustomerPaymentInput } from '@/services/customers.services';
import type { Product } from '@/services/products.services';
import type { SaleInput } from '@/services/sales.services';

// The New sale form as typed, and what saving it writes - lifted from
// Hatim/src/pages/Sales.tsx (addProductToCart, updateItem, the totals and
// save): every line priced to the whole taka with its discount kept within
// the price, the customer's previous due added to what is payable today, the
// money applied to this invoice first and anything beyond it booked as a
// collection against the old due. Pure, so testable.
//
// Two departures. Every line is a product from the catalogue: the website also
// takes a typed "Manual Item", but the server refuses a line without a product
// id, so such a line could never be saved. And an edited line keeps what had
// already gone out of it: the website re-saves a part-delivered line as not
// delivered at all, because the server rewrites every line on an edit.

export type DiscountMode = 'amount' | 'pct';

/** One product on the sale, as typed. Lines are keyed by product: picking it again adds one more. */
export type SaleLine = {
  product_id: string;
  product_code: string;
  product_name: string;
  /** The DP after its DP discount - what the website records as the line's cost. */
  cost_price: number;
  qty: string;
  price: string;
  /** What the discount box shows, in its unit. */
  discount: string;
  mode: DiscountMode;
  /**
   * The discount on each piece, in taka - the website's discount_amount, and
   * what is charged whichever unit the box shows. Typing in the box sets it;
   * a unit switch or a new price leaves it where it was (editLine).
   */
  discountTaka: number;
  delivered: boolean;
  /** Edited lines only: what had already gone out, kept when the line is not marked delivered in full. */
  alreadyDelivered: number;
};

export type SaleForm = {
  invoice_no: string;
  date: string;
  /** A saved customer, or '' for a walk-in typed below. */
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  lines: SaleLine[];
  rows: PaymentRow[];
  notes: string;
  sms: boolean;
};

export type SaleFormErrors = {
  invoice?: true;
  customer?: true;
  phone?: true;
  items?: true;
  overpaid?: true;
  /** By product id. */
  lines: Record<string, { qty?: true; price?: true; discount?: true }>;
  /** By payment row key. */
  rows: Record<string, { account?: true; amount?: true }>;
};

export const newInvoiceNo = (now = new Date()) => docNumber('INV', now);

const figure = (typed: string) => {
  const n = parseAmount(typed);
  return Number.isFinite(n) ? n : 0;
};
const typedOrZero = (typed: string) => (typed.trim() === '' ? 0 : parseAmount(typed));

/** A product's line as the website's addProductToCart starts it: its MRP, no discount, one piece, delivered. */
export function lineForProduct(product: Product): SaleLine {
  return {
    product_id: product.id,
    product_code: product.product_code || '',
    product_name: String(product.name || product.product_code || '').trim(),
    cost_price: actualDp(product.cost_price, product.dp_discount ?? 0),
    qty: '1',
    price: String(Number(product.selling_price || 0)),
    discount: '',
    mode: 'amount',
    discountTaka: 0,
    delivered: true,
    alreadyDelivered: 0,
  };
}

/** Adds a product - or, already on the sale, one more of it. */
export function withProduct(lines: SaleLine[], product: Product): SaleLine[] {
  if (!lines.some((line) => line.product_id === product.id)) return [...lines, lineForProduct(product)];
  return lines.map((line) => {
    if (line.product_id !== product.id) return line;
    const qty = parseAmount(line.qty);
    return { ...line, qty: String((Number.isInteger(qty) ? qty : 0) + 1) };
  });
}

export type PricedLine = { selling_price: number; discount_amount: number; discount_pct: number; actual_price: number; qty: number; total_amount: number };

/**
 * A line priced as updateItem prices it: money to the whole taka, the
 * discount never below 0 or above the price.
 */
export function priceLine(line: SaleLine): PricedLine {
  const selling = figure(line.price);
  const discount = keptDiscount(line.discountTaka, selling);
  const actual = Math.max(0, roundTaka(selling) - discount);
  const qty = figure(line.qty);
  return {
    selling_price: selling,
    discount_amount: discount,
    discount_pct: selling > 0 ? (discount / selling) * 100 : 0,
    actual_price: actual,
    qty,
    total_amount: roundTaka(actual * qty),
  };
}

/** A discount in taka to the whole taka, never below 0 or above the price. */
const keptDiscount = (taka: number, selling: number) => Math.min(Math.max(0, roundTaka(taka)), Math.max(0, roundTaka(selling)));

/**
 * The discount box in its unit, as the website's discountBoxValue draws it:
 * taka as they are, a percentage of the price to one decimal - derived from the
 * money, so switching units never makes a second figure.
 */
export function discountBoxText(discountTaka: number, price: number, mode: DiscountMode): string {
  const money = keptDiscount(discountTaka, price);
  if (money <= 0) return '';
  if (mode === 'amount') return String(money);
  return price > 0 ? String(Math.round((money / price) * 1000) / 10) : '';
}

/**
 * A change to one line, made the website's updateItem way. Typing in the
 * discount box sets the money - taka as typed, or a percent (100 at most) of
 * the price as it then is, turned into taka once - never more than the price.
 * Switching the unit, or changing the price, leaves the money where it was and
 * only redraws the box: Tk 100 switched to percent shows 0.2%, where reading
 * the same 100 as a percent gave the whole line away. A percent past 100, or
 * more taka than the price, is redrawn as what it counts for.
 */
export function editLine(line: SaleLine, patch: Partial<Pick<SaleLine, 'qty' | 'price' | 'discount' | 'mode' | 'delivered'>>): SaleLine {
  const next: SaleLine = { ...line, ...patch };
  const selling = roundTaka(figure(next.price));
  if (patch.discount !== undefined) {
    const typed = Math.max(0, figure(next.discount));
    const asked = next.mode === 'pct' ? roundTaka((selling * Math.min(typed, 100)) / 100) : roundTaka(typed);
    next.discountTaka = keptDiscount(asked, selling);
    if ((next.mode === 'pct' && typed > 100) || (next.mode === 'amount' && asked > next.discountTaka)) {
      next.discount = discountBoxText(next.discountTaka, selling, next.mode);
    }
  } else if (patch.mode !== undefined && patch.mode !== line.mode) {
    next.discountTaka = keptDiscount(line.discountTaka, selling);
    next.discount = discountBoxText(next.discountTaka, selling, next.mode);
  } else if (patch.price !== undefined && next.mode === 'pct') {
    // The money stays; what it is as a share of the new price is redrawn.
    next.discount = discountBoxText(next.discountTaka, selling, 'pct');
  }
  return next;
}

/** The money typed against each account; a blank amount is nothing paid there. */
const paidOf = (row: PaymentRow) => Math.max(0, figure(row.amount));

export type SaleTotals = {
  subtotal: number;
  totalDiscount: number;
  /** What the goods come to - the invoice's own total. */
  invoiceTotal: number;
  previousDue: number;
  /** This invoice plus the old balance: what the customer hands over today. */
  grandTotal: number;
  totalPaid: number;
  due: number;
};

/** The figures under the form. `previousDue` is what may be collected with this sale (0 when it may not). */
export function saleTotals(form: SaleForm, previousDue: number): SaleTotals {
  const priced = form.lines.map(priceLine);
  const invoiceTotal = priced.reduce((s, l) => s + l.total_amount, 0);
  const grandTotal = invoiceTotal + previousDue;
  const totalPaid = form.rows.reduce((s, row) => s + paidOf(row), 0);
  return {
    subtotal: priced.reduce((s, l) => s + l.selling_price * l.qty, 0),
    totalDiscount: priced.reduce((s, l) => s + l.discount_amount * l.qty, 0),
    invoiceTotal,
    previousDue,
    grandTotal,
    totalPaid,
    due: Math.max(0, grandTotal - totalPaid),
  };
}

export function saleFormErrors(form: SaleForm, totals: SaleTotals): SaleFormErrors {
  const errors: SaleFormErrors = { lines: {}, rows: {} };
  if (!form.invoice_no.trim()) errors.invoice = true;
  if (!form.customer_id && !form.customer_name.trim() && !form.customer_phone.trim()) errors.customer = true;
  // A walk-in's phone is optional, but one typed must be a real number.
  if (!form.customer_id && form.customer_phone.trim() && !isValidBdPhone(form.customer_phone)) errors.phone = true;
  if (form.lines.length === 0) errors.items = true;
  for (const line of form.lines) {
    const wrong: { qty?: true; price?: true; discount?: true } = {};
    const qty = parseAmount(line.qty);
    if (!Number.isInteger(qty) || qty <= 0) wrong.qty = true;
    if (!Number.isFinite(parseAmount(line.price))) wrong.price = true;
    if (!Number.isFinite(typedOrZero(line.discount))) wrong.discount = true;
    if (wrong.qty || wrong.price || wrong.discount) errors.lines[line.product_id] = wrong;
  }
  for (const row of form.rows) {
    const amount = typedOrZero(row.amount);
    const wrong: { account?: true; amount?: true } = {};
    if (!Number.isFinite(amount)) wrong.amount = true;
    else if (amount > 0 && !row.account_id) wrong.account = true;
    if (wrong.account || wrong.amount) errors.rows[row.key] = wrong;
  }
  if (totals.totalPaid > totals.grandTotal) errors.overpaid = true;
  return errors;
}

/** "Due Sell" goes on the notes of a sale nothing was paid on, as the website marks it. */
export function notesForPaymentStatus(notes: string, paidAmount: number): string {
  const trimmed = notes.trim();
  if (paidAmount > 0 || trimmed.toLowerCase().includes('due sell')) return trimmed;
  return [trimmed, 'Due Sell'].filter(Boolean).join('\n');
}

export type SalePlan = {
  sale: SaleInput;
  /** Money beyond this invoice, account by account, to book against the old due. */
  dueRows: { account_id: string; amount: number }[];
  finalPaid: number;
  finalDue: number;
};

/**
 * What saving writes, as the website's save() splits it: the money goes to this
 * invoice first, account by account in the order typed, and whatever is left
 * over - never more than the previous due - is collected against the old balance.
 */
export function salePlan(form: SaleForm, customer: Customer | undefined, totals: SaleTotals): SalePlan {
  const valid = form.rows.filter((row) => row.account_id && paidOf(row) > 0);
  const finalPaid = valid.reduce((s, row) => s + paidOf(row), 0);
  const paidToInvoice = Math.min(finalPaid, totals.invoiceTotal);
  const finalDue = Math.max(0, totals.invoiceTotal - paidToInvoice);

  let invoiceRemaining = paidToInvoice;
  const invoiceRows: { account_id: string; amount: number }[] = [];
  const dueRows: { account_id: string; amount: number }[] = [];
  for (const row of valid) {
    const amount = paidOf(row);
    const toInvoice = Math.min(amount, invoiceRemaining);
    invoiceRemaining -= toInvoice;
    if (toInvoice > 0) invoiceRows.push({ account_id: row.account_id, amount: toInvoice });
    if (amount - toInvoice > 0) dueRows.push({ account_id: row.account_id, amount: amount - toInvoice });
  }

  const name = customer ? customer.name : form.customer_name.trim();
  const phone = customer ? String(customer.phone || '') : form.customer_phone.trim();
  return {
    sale: {
      invoice_no: form.invoice_no.trim(),
      date: form.date,
      customer_id: customer?.id ?? null,
      customer_name: name || phone || 'Walk-in Customer',
      customer_phone: phone,
      customer_address: customer ? String(customer.address || '') : form.customer_address.trim(),
      account_id: valid[0]?.account_id || null,
      account_name: '',
      subtotal: totals.subtotal,
      discount_amount: totals.totalDiscount,
      net_amount: totals.invoiceTotal,
      paid_amount: paidToInvoice,
      due_amount: finalDue,
      notes: notesForPaymentStatus(form.notes, paidToInvoice),
      status: 'completed',
      items: form.lines.map((line) => {
        const priced = priceLine(line);
        return {
          product_id: line.product_id,
          product_code: line.product_code || line.product_name,
          product_name: line.product_name,
          selling_price: priced.selling_price,
          discount_pct: priced.discount_pct,
          actual_price: priced.actual_price,
          qty: priced.qty,
          total_amount: priced.total_amount,
          cost_price: line.cost_price,
          delivered_qty: line.delivered ? priced.qty : Math.min(priced.qty, line.alreadyDelivered),
        };
      }),
      payments: invoiceRows.map((row) => ({ date: form.date, account_id: row.account_id, account_name: '', amount: row.amount })),
    },
    dueRows,
    finalPaid,
    finalDue,
  };
}

type Row = Record<string, any>;

/**
 * Whether the form can edit a saved sale: every line must be a catalogue
 * product (the server refuses any other), and each product on it once, as the
 * form keys its lines by product.
 */
export function saleEditable(sale: Row): boolean {
  const ids: string[] = (sale.sale_items || []).map((item: Row) => String(item.product_id || ''));
  return ids.length > 0 && ids.every(Boolean) && new Set(ids).size === ids.length;
}

/**
 * A saved sale back in the form, as the website's editSale fills it: each line
 * at its price with its discount in taka, delivered when nothing of it is
 * still to go; the money as it was split across accounts (or, on an older
 * sale, all of it on its one account); the old due is not collected again.
 */
export function formFromSale(sale: Row, rowKey: (index: number) => string): SaleForm {
  const payments: { account_id: string; amount: number }[] = (sale.sale_payments || [])
    .map((payment: Row) => ({ account_id: String(payment.account_id || ''), amount: Math.max(0, Number(payment.amount || 0)) }))
    .filter((payment: { amount: number }) => payment.amount > 0);
  const paid = Math.max(0, Number(sale.paid_amount || 0));
  const split = payments.length > 0 ? payments : paid > 0 ? [{ account_id: String(sale.account_id || ''), amount: paid }] : [];
  return {
    invoice_no: String(sale.invoice_no || ''),
    date: String(sale.date || '').slice(0, 10),
    customer_id: String(sale.customer_id || ''),
    customer_name: String(sale.customer_name || ''),
    customer_phone: String(sale.customer_phone || ''),
    customer_address: String(sale.customer_address || ''),
    lines: (sale.sale_items || []).map((item: Row): SaleLine => {
      const selling = Number(item.selling_price || 0);
      const discount = Math.max(0, selling - Number(item.actual_price || 0));
      const delivered = pendingQty(item) === 0;
      return {
        product_id: String(item.product_id),
        product_code: String(item.product_code || ''),
        product_name: String(item.product_name || ''),
        cost_price: Number(item.cost_price || 0),
        qty: String(Number(item.qty || 0)),
        price: String(selling),
        discount: discount > 0 ? String(discount) : '',
        mode: 'amount',
        discountTaka: discount,
        delivered,
        alreadyDelivered: delivered ? 0 : deliveredQty(item),
      };
    }),
    rows: split.length > 0 ? split.map((row, i) => ({ key: rowKey(i), account_id: row.account_id, amount: String(row.amount) })) : [{ key: rowKey(0), account_id: '', amount: '' }],
    // The "Due Sell" mark is put back, or taken off, by what is paid on saving.
    notes: String(sale.notes || '')
      .split('\n')
      .filter((line) => line.trim().toLowerCase() !== 'due sell')
      .join('\n'),
    sms: false,
  };
}

/** The collections against the old due, one per account, named after the invoice the server saved. */
export function dueCollections(plan: SalePlan, form: SaleForm, customer: Customer, accounts: Account[], savedInvoiceNo: string): CustomerPaymentInput[] {
  return plan.dueRows.map((row) => ({
    date: form.date,
    customer_id: customer.id,
    customer_name: customer.name || '',
    amount: row.amount,
    account_id: row.account_id,
    account_name: String(accounts.find((a) => a.id === row.account_id)?.name || ''),
    notes: `Previous due collected with invoice ${savedInvoiceNo}`,
  }));
}
