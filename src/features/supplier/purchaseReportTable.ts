import type { Lang } from '@/context/LanguageContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { monthShort, yearLabel } from '@/lib/dates';
import type { PrintableTable } from '@/lib/print';
import type { SupplierYearlyPurchase } from '@/lib/supplierYearlyPurchase';

type Copy = (typeof SUPPLIER_COPY)['en'];

/**
 * The yearly purchase overview as the website's Supplier Report prints it: the
 * twelve months and the total under them, the incentive kept with its minus
 * sign - a column headed "- Incentive" printing a bare number reads as an
 * addition.
 */
export function purchaseReportTable(input: {
  report: SupplierYearlyPurchase;
  year: number;
  supplier: string;
  business: string;
  t: Copy;
  lang: Lang;
  money: (value: unknown) => string;
}): PrintableTable {
  const { report, year, supplier, business, t, lang, money } = input;
  const signed = (value: number) => (value === 0 ? money(0) : `-${money(value)}`);
  const row = (label: string, m: SupplierYearlyPurchase['total']) => [label, money(m.orderValue), signed(m.incentive), money(m.actualDeposit), money(m.depositPaid)];
  return {
    heading: business,
    title: t.reportTitle,
    subtitle: `${supplier} · ${yearLabel(year, lang)}`,
    columns: [
      { label: t.colMonth },
      { label: t.colOrderValue, align: 'right' },
      { label: t.colIncentive, align: 'right' },
      { label: t.colActualDeposit, align: 'right' },
      { label: t.colDeposit, align: 'right' },
    ],
    rows: [...report.months.map((m) => row(monthShort(m.monthIndex, lang), m)), row(t.total, report.total)],
  };
}
