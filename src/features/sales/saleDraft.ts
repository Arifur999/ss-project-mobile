import type { Account } from '@/lib/balance';
import {
  DRAFT_LINE_MAX,
  isProductId,
  isSnapshot,
  snapshotDate,
  snapshotNumber as number,
  snapshotText as text,
  type DraftBody,
} from '@/lib/draftPayload';
import { parseAmount } from '@/lib/money';
import type { Customer } from '@/services/customers.services';

import { discountBoxText, priceLine, type DiscountMode, type SaleForm, type SaleLine, type SaleTotals } from './saleForm';

// A sale parked part-way, in the website's own draft shape - the one
// Hatim/src/lib/draftPayload.ts stamps SALE_DRAFT_VERSION 1, Sales.tsx's
// saveAsDraft writes and its openDraft reads - so a draft parked on the phone
// opens on the website and one parked on the website opens here. The server
// keeps the snapshot without looking inside it, so it is read defensively.
//
// A draft holds no previous-due figure: what the customer owes is read live
// when it is opened, as the website reads it.

export const SALE_DRAFT_VERSION = 1;

/** The form as the website's saveAsDraft parks it: the invoice's fields, its lines priced, and its payment rows. */
export function draftFromForm(form: SaleForm, customer: Customer | undefined, accounts: Account[], totals: SaleTotals): DraftBody {
  const name = customer ? String(customer.name || '') : form.customer_name.trim();
  const phone = customer ? String(customer.phone || '') : form.customer_phone.trim();
  return {
    kind: 'sale',
    title: (name || phone || 'No customer chosen').slice(0, DRAFT_LINE_MAX),
    subtitle: form.invoice_no.trim().slice(0, DRAFT_LINE_MAX),
    amount: totals.grandTotal,
    payload_version: SALE_DRAFT_VERSION,
    data: {
      v: SALE_DRAFT_VERSION,
      form: {
        invoice_no: form.invoice_no,
        date: form.date,
        customer_id: form.customer_id,
        customer_name: name,
        customer_phone: phone,
        customer_address: customer ? String(customer.address || '') : form.customer_address,
        account_id: form.rows[0]?.account_id || '',
        account_name: '',
        notes: form.notes,
      },
      items: form.lines.map((line) => {
        const priced = priceLine(line);
        return {
          product_id: line.product_id,
          product_code: line.product_code,
          product_name: line.product_name,
          selling_price: priced.selling_price,
          discount_amount: priced.discount_amount,
          discount_pct: priced.discount_pct,
          discount_mode: line.mode,
          actual_price: priced.actual_price,
          qty: priced.qty,
          total_amount: priced.total_amount,
          cost_price: line.cost_price,
          delivery_status: line.delivered ? 'delivered' : 'undelivered',
        };
      }),
      paymentRows: form.rows.map((row) => ({
        id: row.key,
        account_id: row.account_id,
        account_name: String(accounts.find((a) => a.id === row.account_id)?.name || ''),
        amount: Math.max(0, parseAmount(row.amount) || 0),
      })),
    },
  };
}

export type OpenedDraft = {
  form: SaleForm;
  /** Lines that could not come back: typed in rather than picked from the products, or a product twice. */
  dropped: number;
};

/**
 * A parked sale back in the form, as the website's openDraft fills it - or
 * null when it is in a shape this app does not know, which the website
 * refuses too rather than guessing. Blank rows are left out; a line that is
 * not a catalogue product cannot be sold, so it is counted rather than kept. A
 * customer no longer on the books becomes the walk-in the names describe.
 */
export function formFromDraft(data: unknown, options: { rowKey: () => string; today: string; isCustomer: (id: string) => boolean }): OpenedDraft | null {
  if (!isSnapshot(data) || data.v !== SALE_DRAFT_VERSION || !isSnapshot(data.form) || !Array.isArray(data.items)) return null;
  const saved = data.form;

  const seen = new Set<string>();
  let dropped = 0;
  const lines: SaleLine[] = [];
  for (const item of data.items) {
    if (!isSnapshot(item)) continue;
    // The website's itemHasSaleValue: a row never filled in is no line at all.
    if (!(text(item.product_name || item.product_code).trim() || number(item.selling_price) > 0 || number(item.total_amount) > 0)) continue;
    const id = text(item.product_id);
    if (!isProductId(id) || seen.has(id)) {
      dropped += 1;
      continue;
    }
    seen.add(id);
    const selling = number(item.selling_price);
    const discount = Math.max(0, number(item.discount_amount));
    const mode: DiscountMode = item.discount_mode === 'pct' ? 'pct' : 'amount';
    lines.push({
      product_id: id,
      product_code: text(item.product_code),
      product_name: text(item.product_name || item.product_code).trim(),
      cost_price: number(item.cost_price),
      qty: String(number(item.qty)),
      price: String(selling),
      // The money is what is kept; a percentage is shown as the website's box shows it.
      discount: discountBoxText(discount, selling, mode),
      mode,
      discountTaka: discount,
      delivered: item.delivery_status === 'delivered',
      alreadyDelivered: 0,
    });
  }

  const rows = (Array.isArray(data.paymentRows) ? data.paymentRows : [])
    .filter(isSnapshot)
    .map((row) => ({ key: options.rowKey(), account_id: text(row.account_id), amount: number(row.amount) > 0 ? String(number(row.amount)) : '' }));
  const customerId = text(saved.customer_id);

  return {
    form: {
      invoice_no: text(saved.invoice_no),
      date: snapshotDate(saved.date, options.today),
      customer_id: customerId && options.isCustomer(customerId) ? customerId : '',
      customer_name: text(saved.customer_name),
      customer_phone: text(saved.customer_phone),
      customer_address: text(saved.customer_address),
      lines,
      rows: rows.length > 0 ? rows : [{ key: options.rowKey(), account_id: '', amount: '' }],
      notes: text(saved.notes),
      sms: false,
    },
    dropped,
  };
}
