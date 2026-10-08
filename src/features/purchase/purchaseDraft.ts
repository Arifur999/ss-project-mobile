import {
  DRAFT_LINE_MAX,
  isProductId,
  isSnapshot,
  snapshotDate,
  snapshotNumber as number,
  snapshotText as text,
  type DraftBody,
} from '@/lib/draftPayload';
import { orderTotals } from '@/lib/purchaseOrder';

import { pricedLines, spPercentOf, type DraftLine, type OrderForm } from './orderForm';

// A purchase order parked part-way, in the website's own draft shape - the one
// Hatim/src/lib/draftPayload.ts stamps PURCHASE_DRAFT_VERSION 1,
// PurchaseOrders.tsx's saveAsDraft writes and its openDraft reads - so a draft
// parked on the phone opens on the website and one parked there opens here.

export const PURCHASE_DRAFT_VERSION = 1;

/** The order as the website's saveAsDraft parks it: the form's fields, its lines priced, and the order's SP percentage. */
export function draftFromOrder(form: OrderForm, supplierName: string): DraftBody {
  const lines = pricedLines(form);
  return {
    kind: 'purchase_order',
    title: supplierName.slice(0, DRAFT_LINE_MAX),
    subtitle: form.si_no.trim().slice(0, DRAFT_LINE_MAX),
    amount: orderTotals(lines).totalAmount,
    payload_version: PURCHASE_DRAFT_VERSION,
    data: {
      v: PURCHASE_DRAFT_VERSION,
      form: {
        si_no: form.si_no,
        supplier_id: form.supplier_id,
        supplier_name: supplierName,
        date: form.date,
        account_id: '',
        notes: form.notes,
        shipping_status: form.shipping_status,
      },
      items: lines.map((line) => ({
        product_id: line.product_id,
        product_code: line.product_code,
        product_name: line.product_name,
        dp_price: line.dp_price,
        discount_pct: line.discount_pct,
        actual_dp: line.actual_dp,
        qty: line.qty,
        total_amount: line.total_amount,
        sp_amount: line.sp_amount,
        deposit_amount: line.deposit_amount,
        received_qty: 0,
      })),
      spPercent: spPercentOf(form.sp),
    },
  };
}

export type OpenedOrderDraft = {
  form: OrderForm;
  /** Lines that could not come back: typed in rather than picked from the products, or a product twice. */
  dropped: number;
  /** The supplier it was for is no longer on the books, so none is chosen. */
  supplierGone: boolean;
};

/**
 * A parked order back in the form, as the website's openDraft fills it - or
 * null when it is in a shape this app does not know, which the website
 * refuses too. Blank rows are left out; a line that is not a catalogue
 * product cannot be ordered, so it is counted rather than kept; a supplier
 * since removed is dropped and said so, rather than refused only on saving.
 */
export function orderFromDraft(data: unknown, options: { today: string; isSupplier: (id: string) => boolean }): OpenedOrderDraft | null {
  if (!isSnapshot(data) || data.v !== PURCHASE_DRAFT_VERSION || !isSnapshot(data.form) || !Array.isArray(data.items)) return null;
  const saved = data.form;

  const seen = new Set<string>();
  let dropped = 0;
  const lines: DraftLine[] = [];
  for (const item of data.items) {
    if (!isSnapshot(item)) continue;
    // A row never filled in is no line at all.
    if (!(text(item.product_name || item.product_code).trim() || number(item.dp_price) > 0 || number(item.total_amount) > 0)) continue;
    const id = text(item.product_id);
    if (!isProductId(id) || seen.has(id)) {
      dropped += 1;
      continue;
    }
    seen.add(id);
    lines.push({
      product_id: id,
      product_code: text(item.product_code),
      product_name: text(item.product_name || item.product_code).trim(),
      qty: String(number(item.qty)),
      dp: String(number(item.dp_price)),
      discount: String(number(item.discount_pct)),
    });
  }

  const supplierId = text(saved.supplier_id);
  const supplierGone = !!supplierId && !options.isSupplier(supplierId);
  const sp = number(data.spPercent);
  return {
    form: {
      si_no: text(saved.si_no),
      supplier_id: supplierGone ? '' : supplierId,
      date: snapshotDate(saved.date, options.today),
      shipping_status: saved.shipping_status === 'received' ? 'received' : 'pending',
      sp: sp > 0 ? String(sp) : '',
      notes: text(saved.notes),
      lines,
    },
    dropped,
    supplierGone,
  };
}
