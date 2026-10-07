import type { Lang } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { receiptNo, type Receipt } from '@/lib/customerReceipts';
import { dateLabel } from '@/lib/dates';
import type { PrintableTable } from '@/lib/print';

type Copy = (typeof CUSTOMER_COPY)['en'];

/**
 * A due collection as the website's money receipt prints it: the business
 * across the top, the receipt number, customer and date, each account the
 * money went into, then the due before, the discount and the due after.
 */
export function receiptTable(input: { receipt: Receipt; business: string; t: Copy; lang: Lang; money: (value: unknown) => string }): PrintableTable {
  const { receipt, business, t, lang, money } = input;
  return {
    heading: business,
    title: `${t.receiptTitle} ${receiptNo(receipt)}`,
    subtitle: [receipt.customer_name, receipt.customer_phone, dateLabel(String(receipt.date || ''), lang)].filter(Boolean).join(' · '),
    columns: [{ label: t.colAccount }, { label: t.colAmount, align: 'right' }],
    rows: receipt.payment_methods.map((method) => [method.account_name || '-', money(method.amount)]),
    footer: [
      [t.previousDue, money(receipt.previous_due)],
      [t.received, money(receipt.total_received)],
      ...(receipt.discount > 0 ? ([[t.discount, money(receipt.discount)]] as [string, string][]) : []),
      [t.dueAfter, money(receipt.current_due)],
      ...(receipt.payment_receiver ? ([[t.receivedBy, receipt.payment_receiver]] as [string, string][]) : []),
    ],
  };
}
