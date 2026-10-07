import type { Lang } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { ledgerDetails } from '@/features/customers/ledgerText';
import type { LedgerEntry, LedgerSummary } from '@/lib/customerLedger';
import { dateLabel } from '@/lib/dates';
import type { PrintableTable } from '@/lib/print';
import type { Customer } from '@/services/customers.services';

type Copy = (typeof CUSTOMER_COPY)['en'];

/**
 * A customer's ledger as the website prints it: the business, the customer
 * and their contact, every row oldest first with what it added and took off
 * and the due after it, and the summary under the table.
 */
export function ledgerTable(input: {
  customer: Customer;
  ledger: LedgerEntry[];
  summary: LedgerSummary;
  business: string;
  t: Copy;
  lang: Lang;
  money: (value: unknown) => string;
}): PrintableTable {
  const { customer, ledger, summary, business, t, lang, money } = input;
  const figure = (n: number) => (n > 0 ? money(n) : '');
  return {
    heading: business,
    title: t.ledgerTitle(customer.name),
    subtitle: [customer.phone, customer.address].filter(Boolean).join(' · '),
    columns: [
      { label: t.colDate },
      { label: t.colRef },
      { label: t.colDetails },
      { label: t.purchasePlus, align: 'right' },
      { label: t.discount, align: 'right' },
      { label: t.paidMinus, align: 'right' },
      { label: t.colDue, align: 'right' },
    ],
    rows: ledger.map((entry) => [
      dateLabel(entry.date, lang),
      entry.reference,
      ledgerDetails(entry, t, lang),
      figure(entry.purchase),
      figure(entry.discount),
      figure(entry.payment),
      money(entry.current_due),
    ]),
    footer: [
      [t.openingDue, money(summary.openingDue)],
      [t.totalPurchase, money(summary.totalPurchase)],
      [t.totalDiscount, money(summary.totalDiscount)],
      [t.totalPaid, money(summary.totalPaid)],
      [t.currentDue, money(summary.currentDue)],
    ],
  };
}
