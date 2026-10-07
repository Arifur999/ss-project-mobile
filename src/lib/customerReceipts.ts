import { parseAmountText, parseMetaValue, saleDue } from './customerDue';
import { todayISO } from './dates';

// The Due Received list, lifted from Hatim/src/pages/customers/
// CustomerDueReceived.tsx (groupedPayments, displayNotes, receiptNo): the rows
// one collection was split into - one per account - read as one receipt, and
// each receipt carries the customer's due before and after it. Left out: the
// website's guess at a discount's category from the latest 500 expenses, for
// receipts saved before the category was written into the notes.

type Row = Record<string, any>;

export type Receipt = Row & {
  payment_ids: string[];
  payment_methods: { account_name: string; amount: number }[];
  total_received: number;
  customer_phone: string;
  discount: number;
  discount_category: string;
  payment_receiver: string;
  display_notes: string;
  previous_due: number;
  current_due: number;
};

/** The notes as typed, without the lines the form writes for the discount and receiver. */
export function displayNotes(notes: string) {
  return String(notes || '')
    .split('\n')
    .filter((line) => {
      const lower = line.toLowerCase();
      return !lower.startsWith('discount amount:') && !lower.startsWith('discount category:') && !lower.startsWith('received by:');
    })
    .join('\n')
    .trim();
}

/** "DR-2026-417": the year and the last three digits of the first row's id. */
export function receiptNo(receipt: Row) {
  const year = String(receipt?.date || todayISO()).slice(0, 4);
  const suffix = String(receipt?.payment_ids?.[0] || receipt?.id || Date.now())
    .replace(/\D/g, '')
    .slice(-3)
    .padStart(3, '0');
  return `DR-${year}-${suffix}`;
}

const byTime = (a: Row, b: Row) =>
  new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime() || new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();

/** Every receipt, newest first. `sales` are the completed ones. */
export function groupReceipts(payments: Row[], customers: Row[], sales: Row[]): Receipt[] {
  const customerById: Record<string, Row> = {};
  customers.forEach((customer) => {
    customerById[customer.id] = customer;
  });
  const salesDueByCustomer: Record<string, number> = {};
  sales.forEach((sale) => {
    salesDueByCustomer[sale.customer_id] = (salesDueByCustomer[sale.customer_id] || 0) + saleDue(sale);
  });

  // Saved together means the same date, customer and notes within the same second.
  const groups = new Map<string, Receipt>();
  payments.forEach((payment) => {
    const key = [payment.date || '', payment.customer_id || '', payment.notes || '', String(payment.created_at || '').slice(0, 19)].join('|');
    const existing = groups.get(key);
    const method = { account_name: payment.account_name || '', amount: Number(payment.amount || 0) };
    if (existing) {
      existing.payment_ids.push(payment.id);
      existing.payment_methods.push(method);
      existing.total_received += method.amount;
      return;
    }
    const notes = payment.notes || '';
    groups.set(key, {
      ...payment,
      payment_ids: [payment.id],
      payment_methods: [method],
      total_received: method.amount,
      customer_phone: customerById[payment.customer_id]?.phone || '',
      discount: parseAmountText(parseMetaValue(notes, 'Discount Amount')),
      discount_category: parseMetaValue(notes, 'Discount Category'),
      payment_receiver: parseMetaValue(notes, 'Received by'),
      display_notes: displayNotes(notes),
      previous_due: 0,
      current_due: 0,
    });
  });

  // Walked oldest first, so each receipt starts from the due the one before it left.
  const receipts = Array.from(groups.values()).sort(byTime);
  const runningDue: Record<string, number> = {};
  receipts.forEach((receipt) => {
    if (runningDue[receipt.customer_id] == null) {
      runningDue[receipt.customer_id] = Math.max(
        0,
        Number(customerById[receipt.customer_id]?.opening_due || 0) + Number(salesDueByCustomer[receipt.customer_id] || 0),
      );
    }
    receipt.previous_due = runningDue[receipt.customer_id];
    receipt.current_due = Math.max(0, receipt.previous_due - Number(receipt.total_received || 0) - Number(receipt.discount || 0));
    runningDue[receipt.customer_id] = receipt.current_due;
  });
  return receipts.reverse();
}
