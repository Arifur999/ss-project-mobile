import type { PaymentRow } from '@/components/PaymentRowFields';
import type { Account } from '@/lib/balance';
import { docNumber } from '@/lib/docNumber';
import { parseAmount, roundTaka } from '@/lib/money';
import { isValidBdPhone } from '@/lib/phone';
import { actualDp } from '@/lib/purchaseAmounts';
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
// One departure: every line is a product from the catalogue. The website also
// takes a typed "Manual Item", but POST /sales refuses a line without a
// product id, so such a line could never be saved.

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
  discount: string;
  mode: DiscountMode;
  delivered: boolean;
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
    delivered: true,
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
 * A line priced as updateItem prices it: money to the whole taka, a percentage
 * turned into taka once, the discount never below 0 or above the price.
 */
export function priceLine(line: SaleLine): PricedLine {
  const selling = figure(line.price);
  const typed = Math.max(0, figure(line.discount));
  const asTaka = line.mode === 'pct' ? roundTaka((roundTaka(selling) * Math.min(typed, 100)) / 100) : typed;
  const discount = Math.min(Math.max(0, roundTaka(asTaka)), Math.max(0, roundTaka(selling)));
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
          delivered_qty: line.delivered ? priced.qty : 0,
        };
      }),
      payments: invoiceRows.map((row) => ({ date: form.date, account_id: row.account_id, account_name: '', amount: row.amount })),
    },
    dueRows,
    finalPaid,
    finalDue,
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
