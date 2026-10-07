import type { Lang } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import type { LedgerEntry } from '@/lib/customerLedger';
import { formatNumber } from '@/lib/money';

type Copy = (typeof CUSTOMER_COPY)['en'];

/** What a ledger row was, in words: "Chair × 2", "Invoice sale", "Due received · Cash" - the screen's and the printout's. */
export function ledgerDetails(entry: LedgerEntry, t: Copy, lang: Lang): string {
  if (entry.entry_type === 'payment') return [t.collection, entry.account_name].filter(Boolean).join(' · ');
  if (!entry.product_name) return t.invoiceSale;
  return entry.qty ? t.itemQty(entry.product_name, formatNumber(entry.qty, lang)) : entry.product_name;
}
