import { parseAmount } from '@/lib/money';
import { purchaseItemDeposit } from '@/lib/purchaseAmounts';
import { receivedOf, repriceLine, type OrderLine } from '@/lib/purchaseOrder';
import type { Product } from '@/services/products.services';

import { draftForProduct, spPercentOf, type DraftLine, type LineErrors } from './orderForm';

// Editing a saved purchase invoice - the website's Purchase Ledger edit
// (PurchaseLedger.tsx: openEditInvoice, updateEditItem, removeEditItem and
// saveEditedInvoice): the SI no, supplier and date; each line's quantity
// (never below what has arrived), DP and DP discount; lines added from the
// products; lines nothing has arrived on taken off. Saved in the website's
// order - new lines, changed lines, removed lines, then the header - so the
// header's total is the last word. Pure, so testable.
//
// Three departures, each where the website's edit leaves the invoice
// disagreeing with itself:
// - A changed line's SP is worked out again at the invoice's SP percentage,
//   as the order form works it; the website keeps the old SP amount against a
//   new total. A line left alone keeps its saved figures exactly.
// - The supplier is picked from the list and saved by id and name together;
//   the website's edit retypes only the name.
// - The shipping status is worked out again from what has arrived against
//   the new quantities; the website leaves it as it was.

type Row = Record<string, any>;

export type EditLine = DraftLine & {
  /** The form's key for it: the saved line's id, or a new one's. */
  key: string;
  /** '' for a line added in this edit. */
  id: string;
  received: number;
  /** As saved: what it stays at until one of its figures is changed. */
  saved: OrderLine | null;
  changed: boolean;
};

export type PurchaseEditForm = {
  si_no: string;
  supplier_id: string;
  date: string;
  /** The SP percentage changed lines are priced at; `savedSp` is what it opened as. */
  sp: string;
  savedSp: string;
  notes: string;
  lines: EditLine[];
  /** Saved lines taken off. */
  removed: string[];
};

export type EditLineErrors = LineErrors & { belowReceived?: true };

export type PurchaseEditErrors = {
  supplier?: true;
  siNo?: true;
  date?: true;
  items?: true;
  percent?: true;
  /** By line key. */
  lines: Record<string, EditLineErrors>;
};

const typedPercent = (typed: string) => (typed.trim() === '' ? 0 : parseAmount(typed));
const isPercent = (n: number) => n >= 0 && n <= 100;
const figure = (typed: string) => {
  const n = parseAmount(typed);
  return Number.isFinite(n) ? n : 0;
};

/** What has arrived on a line: its receives, or the count kept on it, whichever is more. */
const arrived = (item: Row) => Math.max(receivedOf(item), Number(item.received_qty || 0));

function savedLine(item: Row): OrderLine {
  return {
    product_id: String(item.product_id || ''),
    product_code: String(item.product_code || ''),
    product_name: String(item.product_name || ''),
    dp_price: Number(item.dp_price || 0),
    discount_pct: Number(item.discount_pct || 0),
    actual_dp: Number(item.actual_dp || item.dp_price || 0),
    qty: Number(item.qty || 0),
    total_amount: Number(item.total_amount || 0),
    sp_amount: Number(item.sp_amount || 0),
    deposit_amount: purchaseItemDeposit(item),
  };
}

/** A saved invoice in the form, as openEditInvoice fills it. Its SP percentage is the one its lines were priced at. */
export function editFormFromPurchase(purchase: Row): PurchaseEditForm {
  const items: Row[] = purchase.purchase_items || [];
  const sp = String(Number(items.find((item) => Number(item.sp_pct || 0) > 0)?.sp_pct || 0) || '');
  return {
    si_no: String(purchase.si_no || ''),
    supplier_id: String(purchase.supplier_id || ''),
    date: String(purchase.date || '').slice(0, 10),
    sp,
    savedSp: sp,
    notes: String(purchase.notes || ''),
    lines: items.map((item) => ({
      key: String(item.id),
      id: String(item.id),
      product_id: String(item.product_id || ''),
      product_code: String(item.product_code || ''),
      product_name: String(item.product_name || ''),
      qty: String(Number(item.qty || 0)),
      dp: String(Number(item.dp_price || 0)),
      discount: String(Number(item.discount_pct || 0)),
      received: arrived(item),
      saved: savedLine(item),
      changed: false,
    })),
    removed: [],
  };
}

/** Every line's figures: as saved while it and the SP percentage are untouched, else priced again the order form's way. */
export function editPricedLines(form: PurchaseEditForm): OrderLine[] {
  const percent = spPercentOf(form.sp);
  const spMoved = percent !== spPercentOf(form.savedSp);
  return form.lines.map((line) =>
    line.saved && !line.changed && !spMoved
      ? line.saved
      : repriceLine(
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

/** Adds a product - or, already on the invoice, one more of it, as the order form does. */
export function withEditProduct(lines: EditLine[], product: Product, key: string): EditLine[] {
  const index = lines.findIndex((line) => line.product_id === product.id);
  if (index < 0) return [...lines, { ...draftForProduct(product), key, id: '', received: 0, saved: null, changed: true }];
  return lines.map((line, i) => {
    if (i !== index) return line;
    const qty = parseAmount(line.qty);
    return { ...line, qty: String((Number.isInteger(qty) ? qty : 0) + 1), changed: true };
  });
}

export function editFormErrors(form: PurchaseEditForm): PurchaseEditErrors {
  const errors: PurchaseEditErrors = { lines: {} };
  if (!form.supplier_id) errors.supplier = true;
  if (!form.si_no.trim()) errors.siNo = true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = true;
  // Taking off every line would delete the invoice; that is the Delete action's job.
  if (form.lines.length === 0) errors.items = true;
  if (!isPercent(typedPercent(form.sp))) errors.percent = true;
  for (const line of form.lines) {
    const qty = parseAmount(line.qty);
    const wrong: EditLineErrors = {};
    if (!Number.isInteger(qty) || qty <= 0) wrong.qty = true;
    else if (qty < line.received) {
      wrong.qty = true;
      wrong.belowReceived = true;
    }
    // A saved line may carry a DP of 0; one being priced now needs a real one, as on a new order.
    if (!(parseAmount(line.dp) >= 0) || ((line.changed || !line.saved) && !(parseAmount(line.dp) > 0))) wrong.dp = true;
    if (!isPercent(typedPercent(line.discount))) wrong.discount = true;
    if (wrong.qty || wrong.dp || wrong.discount) errors.lines[line.key] = wrong;
  }
  return errors;
}

/**
 * What has been paid against this bill: what was settled when it was entered
 * plus every payment sent for it afterwards (by id, or by SI no on older
 * payments) - the Purchase Ledger's paid figure.
 */
export function paidOnPurchase(purchase: Row, payments: Row[]): number {
  const later = payments
    .filter((p) => (p.purchase_id && p.purchase_id === purchase.id) || (!p.purchase_id && p.purchase_si_no && p.purchase_si_no === purchase.si_no))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return later + Number(purchase.paid_amount || 0);
}

export type PurchaseItemFields = {
  dp_price: number;
  discount_pct: number;
  actual_dp: number;
  qty: number;
  total_amount: number;
  sp_pct: number;
  sp_amount: number;
};

export type NewPurchaseItem = PurchaseItemFields & { product_id: string; product_code: string; product_name: string };

export type PurchaseHeader = {
  si_no: string;
  supplier_id: string;
  supplier_name: string;
  date: string;
  notes: string;
  total_amount: number;
  net_amount: number;
  due_amount: number;
  shipping_status: 'pending' | 'partial' | 'received';
};

export type PurchaseEditPlan = {
  add: NewPurchaseItem[];
  update: { id: string; patch: PurchaseItemFields }[];
  remove: string[];
  header: PurchaseHeader;
};

// The figures a line's write carries, besides its SP percentage.
const FIELDS: (keyof OrderLine & keyof PurchaseItemFields)[] = ['dp_price', 'discount_pct', 'actual_dp', 'qty', 'total_amount', 'sp_amount'];

/** The requests saving makes: only the lines whose figures moved are written, and the header last with the new total. */
export function editPlan(form: PurchaseEditForm, supplierName: string, paid: number): PurchaseEditPlan {
  const priced = editPricedLines(form);
  const percent = spPercentOf(form.sp);
  const fields = (line: OrderLine, sp: number): PurchaseItemFields => ({
    dp_price: line.dp_price,
    discount_pct: line.discount_pct,
    actual_dp: line.actual_dp,
    qty: line.qty,
    total_amount: line.total_amount,
    sp_pct: sp,
    sp_amount: line.sp_amount,
  });

  const add: NewPurchaseItem[] = [];
  const update: { id: string; patch: PurchaseItemFields }[] = [];
  form.lines.forEach((line, i) => {
    const now = priced[i];
    if (!line.id) {
      add.push({ product_id: line.product_id, product_code: line.product_code, product_name: line.product_name, ...fields(now, percent) });
    } else if (line.saved && now !== line.saved && FIELDS.some((key) => now[key] !== line.saved![key])) {
      update.push({ id: line.id, patch: fields(now, percent) });
    }
  });

  const total = priced.reduce((sum, line) => sum + line.total_amount, 0);
  const allIn = form.lines.every((line, i) => line.received >= priced[i].qty);
  const someIn = form.lines.some((line) => line.received > 0);
  return {
    add,
    update,
    remove: form.removed,
    header: {
      si_no: form.si_no.trim(),
      supplier_id: form.supplier_id,
      supplier_name: supplierName,
      date: form.date,
      notes: form.notes.trim(),
      total_amount: total,
      net_amount: total,
      due_amount: Math.max(0, total - paid),
      shipping_status: allIn ? 'received' : someIn ? 'partial' : 'pending',
    },
  };
}
