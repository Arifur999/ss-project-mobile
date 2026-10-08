import type { PaymentRow } from '@/components/PaymentRowFields';
import type { Account } from '@/lib/balance';
import type { Receipt } from '@/lib/customerReceipts';
import { parseAmount } from '@/lib/money';
import type { CustomerPaymentInput } from '@/services/customers.services';

// Editing a due collection - the website's Edit Due received (CustomerDue
// Received.tsx: openModal with a payment, then saveDueReceived's update): its
// date, customer, the account it went into and how much, who took it and the
// notes, never more than the customer owes besides it. Pure, so testable.
//
// Two departures, both where the website's edit loses money silently:
// - Only a collection into one account can be edited. The website edits the
//   first row of a split one and leaves the others as they were.
// - The discount stays exactly as it was - its lines kept in the notes, and no
//   expense booked. The website books the discount's expense again on every
//   edit, so the same discount is counted as an expense twice or more.

export type ReceiptEditForm = {
  date: string;
  customer_id: string;
  row: PaymentRow;
  receiver: string;
  notes: string;
};

export type ReceiptEditErrors = {
  date?: true;
  customer?: true;
  receiver?: true;
  /** More than the customer owes besides this collection. */
  tooMuch?: true;
  row?: { account?: true; amount?: true };
};

/** Whether the app can edit it: one row, so one account. */
export const receiptEditable = (receipt: Receipt) => receipt.payment_ids.length === 1;

/** A collection in the form, as the website's openModal fills it. */
export function editFormFromReceipt(receipt: Receipt, rowKey: string): ReceiptEditForm {
  return {
    date: String(receipt.date || '').slice(0, 10),
    customer_id: String(receipt.customer_id || ''),
    row: { key: rowKey, account_id: String(receipt.account_id || ''), amount: String(Number(receipt.amount || 0)) },
    receiver: receipt.payment_receiver,
    notes: receipt.display_notes,
  };
}

const amountOf = (typed: string) => {
  const n = parseAmount(typed);
  return Number.isFinite(n) ? n : 0;
};

/** `owedBesides` is what the customer owes without this collection; its discount still counts against it. */
export function receiptEditErrors(form: ReceiptEditForm, owedBesides: number, discount: number): ReceiptEditErrors {
  const errors: ReceiptEditErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = true;
  if (!form.customer_id) errors.customer = true;
  if (!form.receiver.trim()) errors.receiver = true;
  const row: { account?: true; amount?: true } = {};
  if (!form.row.account_id) row.account = true;
  if (!(parseAmount(form.row.amount) > 0)) row.amount = true;
  if (row.account || row.amount) errors.row = row;
  if (form.customer_id && amountOf(form.row.amount) + discount > owedBesides) errors.tooMuch = true;
  return errors;
}

/** The discount's lines exactly as they were written, so it reads back the same. */
function discountLines(notes: string) {
  return String(notes || '')
    .split('\n')
    .filter((line) => {
      const lower = line.trim().toLowerCase();
      return lower.startsWith('discount amount:') || lower.startsWith('discount category:');
    });
}

/** The row as the website's buildPayload writes it, the notes in its order: what was typed, the discount, the receiver. */
export function receiptUpdate(form: ReceiptEditForm, receipt: Receipt, customerName: string, accounts: Account[]): CustomerPaymentInput {
  const receiver = form.receiver.trim();
  return {
    date: form.date,
    customer_id: form.customer_id,
    customer_name: customerName,
    amount: amountOf(form.row.amount),
    account_id: form.row.account_id,
    account_name: String(accounts.find((a) => a.id === form.row.account_id)?.name || ''),
    notes: [form.notes.trim(), ...discountLines(String(receipt.notes || '')), receiver ? `Received by: ${receiver}` : ''].filter(Boolean).join('\n'),
  };
}
