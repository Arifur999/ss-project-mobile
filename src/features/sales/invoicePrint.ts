import type { Lang } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { PrintableTable } from '@/lib/print';
import { invoiceDeliveryCharge, saleDiscount, saleGrossTotal } from '@/lib/saleFigures';

type Row = Record<string, any>;
type Copy = (typeof SALES_COPY)['en'];

/**
 * A sale as the website's printed invoice reads: the business, the invoice
 * number, customer, phone, address and date, each product with its code,
 * quantity, unit price and total, then subtotal, discount, any delivery
 * charge, the invoice total, the previous due, what was paid, where it went
 * and the current due.
 */
export function invoiceTable(input: {
  sale: Row;
  previousDue: number;
  paidInto: string;
  business: string;
  t: Copy;
  lang: Lang;
  money: (value: unknown) => string;
}): PrintableTable {
  const { sale, previousDue, paidInto, business, t, lang, money } = input;
  const net = Number(sale.net_amount || 0);
  const paid = Number(sale.paid_amount || 0);
  const charge = invoiceDeliveryCharge(sale);
  return {
    heading: business,
    title: t.invoiceTitle(String(sale.invoice_no || '')),
    subtitle: [sale.customer_name || t.walkIn, sale.customer_phone, sale.customer_address, dateLabel(String(sale.date || ''), lang)].filter(Boolean).join(' · '),
    columns: [
      { label: '#' },
      { label: t.colProduct },
      { label: t.colCode },
      { label: t.colQty, align: 'right' },
      { label: t.colUnitPrice, align: 'right' },
      { label: t.colTotal, align: 'right' },
    ],
    rows: (sale.sale_items || []).map((item: Row, i: number) => [
      i + 1,
      item.product_name || '',
      item.product_code || '',
      formatNumber(item.qty, lang),
      money(item.actual_price),
      money(item.total_amount),
    ]),
    footer: [
      [t.subtotal, money(saleGrossTotal(sale))],
      [t.discount, money(saleDiscount(sale))],
      ...(charge > 0 ? ([[t.deliveryCharge, money(charge)]] as [string, string][]) : []),
      [t.invoiceTotal, money(net)],
      [t.previousDue, money(previousDue)],
      [t.paid, paidInto ? `${money(paid)} (${paidInto})` : money(paid)],
      [t.currentDue, money(Math.max(0, previousDue + net - paid))],
    ],
  };
}
