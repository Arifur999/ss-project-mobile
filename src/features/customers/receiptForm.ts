import type { PaymentRow } from '@/components/PaymentRowFields';
import type { Account } from '@/lib/balance';
import { parseAmount, roundTaka } from '@/lib/money';
import type { CustomerPaymentInput } from '@/services/customers.services';
import type { Category, ExpenseInput } from '@/services/expenses.services';

// The Receive due form as typed, and what saving it writes - lifted from
// Hatim/src/pages/customers/CustomerDueReceived.tsx (saveDueReceived): one
// customer_payments row per account the money went into, every row carrying
// the same notes with the discount and receiver written in, and a discount
// booked as an expense with no account. Pure, so testable.
//
// One departure: a discount is allowed only on a collection into one account.
// The website writes the discount into every row's notes, and every reader of
// those notes counts it once per row, so a split collection with a discount
// takes the discount off the customer's due twice or more.

export type ReceiptForm = {
  date: string;
  customer_id: string;
  rows: PaymentRow[];
  discount: string;
  category_id: string;
  receiver: string;
  notes: string;
  sms: boolean;
};

export type ReceiptFormErrors = {
  customer?: true;
  receiver?: true;
  discount?: true;
  category?: true;
  /** A discount on a collection split across accounts. */
  split?: true;
  /** More than the customer owes. */
  tooMuch?: true;
  /** By row key: which of a row's two fields is wrong. */
  lines: Record<string, { account?: true; amount?: true }>;
};

const amountOf = (typed: string) => {
  const n = parseAmount(typed);
  return Number.isFinite(n) ? n : 0;
};

/** What is being handed over now, across every account. */
export const receivingNow = (form: ReceiptForm) => form.rows.reduce((sum, row) => sum + amountOf(row.amount), 0);

/** The discount written off; a blank one is none. */
export const discountOf = (form: ReceiptForm) => (form.discount.trim() === '' ? 0 : parseAmount(form.discount));

export function receiptFormErrors(form: ReceiptForm, previousDue: number): ReceiptFormErrors {
  const errors: ReceiptFormErrors = { lines: {} };
  if (!form.customer_id) errors.customer = true;
  if (!form.receiver.trim()) errors.receiver = true;
  for (const row of form.rows) {
    const wrong: { account?: true; amount?: true } = {};
    if (!row.account_id) wrong.account = true;
    if (!(parseAmount(row.amount) > 0)) wrong.amount = true;
    if (wrong.account || wrong.amount) errors.lines[row.key] = wrong;
  }
  const discount = discountOf(form);
  if (!Number.isFinite(discount)) errors.discount = true;
  else if (discount > 0) {
    if (!form.category_id) errors.category = true;
    if (form.rows.length > 1) errors.split = true;
  }
  // A collection can only settle what is owed, as the website refuses.
  if (form.customer_id && receivingNow(form) + (Number.isFinite(discount) ? discount : 0) > previousDue) errors.tooMuch = true;
  return errors;
}

/** "Tk 1,500" - the website's English formatCurr, which is what its notes are read back with whatever the screen's language. */
const noteTaka = (value: number) => `Tk ${roundTaka(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** The notes every row carries: what was typed, then the discount, its category and the receiver on lines of their own. */
export function receiptNotes(form: ReceiptForm, category: Category | undefined): string {
  const discount = discountOf(form);
  const receiver = form.receiver.trim();
  return [
    form.notes.trim(),
    discount > 0 ? `Discount Amount: ${noteTaka(discount)}` : '',
    discount > 0 && category ? `Discount Category: ${category.name}` : '',
    receiver ? `Received by: ${receiver}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** One payment per account, field for field the website's buildPayload. */
export function paymentInputs(form: ReceiptForm, customerName: string, accounts: Account[], category: Category | undefined): CustomerPaymentInput[] {
  const notes = receiptNotes(form, category);
  return form.rows.map((row) => ({
    date: form.date,
    customer_id: form.customer_id,
    customer_name: customerName,
    amount: amountOf(row.amount),
    account_id: row.account_id,
    account_name: String(accounts.find((a) => a.id === row.account_id)?.name || ''),
    notes,
  }));
}

/**
 * The discount as the website books it: an expense with no account, because
 * no money left the till - it counts toward expenses and profit but never
 * moves an account balance.
 */
export function discountExpense(form: ReceiptForm, category: Category, customerName: string): ExpenseInput {
  return {
    date: form.date,
    category_id: category.id,
    category_name: category.name,
    amount: discountOf(form),
    account_id: null,
    account_name: '',
    notes: `Automatically generated from Customer Due Discount${customerName ? ` - ${customerName}` : ''}`,
  };
}
