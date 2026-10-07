import type { Lang } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { PrintableTable } from '@/lib/print';
import { invoiceMetrics } from '@/lib/purchaseOrder';
import { purchaseItemDeposit } from '@/lib/purchaseAmounts';

type Row = Record<string, any>;
type Copy = (typeof PURCHASE_COPY)['en'];

/**
 * A purchase invoice as the website's voucher prints it: the business across
 * the top, each line's DP, discount, actual DP, quantity, total, SP and
 * deposit, and the ledger's totals under it.
 */
export function voucherTable(input: {
  purchase: Row;
  supplier: string;
  business: string;
  t: Copy;
  lang: Lang;
  money: (value: unknown) => string;
}): PrintableTable {
  const { purchase, supplier, business, t, lang, money } = input;
  const metrics = invoiceMetrics(purchase);
  return {
    heading: business,
    title: t.voucherTitle(String(purchase.si_no || '')),
    subtitle: `${supplier} · ${dateLabel(String(purchase.date || ''), lang)}`,
    columns: [
      { label: t.colNo },
      { label: t.colCode },
      { label: t.colProduct },
      { label: t.colDp, align: 'right' },
      { label: t.colDiscount, align: 'right' },
      { label: t.colActual, align: 'right' },
      { label: t.colQty, align: 'right' },
      { label: t.colTotal, align: 'right' },
      { label: t.colSp, align: 'right' },
      { label: t.colDeposit, align: 'right' },
    ],
    rows: (purchase.purchase_items || []).map((item: Row, i: number) => [
      i + 1,
      item.product_code || '',
      item.product_name || '',
      money(item.dp_price),
      formatNumber(item.discount_pct, lang),
      money(item.actual_dp),
      formatNumber(item.qty, lang),
      money(item.total_amount),
      money(item.sp_amount),
      money(purchaseItemDeposit(item)),
    ]),
    footer: [
      [t.totalDp, money(metrics.totalDpAmount)],
      [t.regularDiscount, money(metrics.discountAmount)],
      [t.specialDiscount, money(metrics.specialDiscountAmount)],
      [t.grandTotal, money(metrics.grandTotal)],
    ],
  };
}
