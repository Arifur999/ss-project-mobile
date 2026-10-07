import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { formatNumber } from '@/lib/money';
import type { BreakdownRow, ReportData } from '@/lib/reportSummary';

export type BreakdownTab = 'sales' | 'purchases' | 'expenses' | 'supplier' | 'otherIncome';
export const BREAKDOWN_TABS: BreakdownTab[] = ['sales', 'purchases', 'expenses', 'supplier', 'otherIncome'];

/** The rows one tab lists. */
export const breakdownRows = (report: ReportData, tab: BreakdownTab): BreakdownRow[] =>
  ({
    sales: report.salesBreakdown,
    purchases: report.purchaseBreakdown,
    expenses: report.expenseBreakdown,
    supplier: report.supplierPaymentBreakdown,
    otherIncome: report.otherIncomeBreakdown,
  })[tab];

/**
 * One of the Report Summary's five tables as a list: each row's name, what it
 * is made of (pieces and profit, SP, entries, owed and paid), its amount and
 * its share of the whole.
 */
export function BreakdownList({ tab, report, limit }: { tab: BreakdownTab; report: ReportData; limit: number }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const num = (n: unknown) => formatNumber(n, lang);
  const rows = breakdownRows(report, tab);
  const detail = (row: BreakdownRow) => {
    switch (tab) {
      case 'sales':
        return `${t.qtyCount(num(row.qty))} · ${t.profit} ${money(row.profit)}`;
      case 'purchases':
        return `${t.qtyCount(num(row.qty))} · SP ${money(row.incentive)}`;
      case 'supplier':
        return t.owedPaidDue(money(row.owed), money(row.paid), money(row.due));
      default:
        return [row.type, t.entries(num(row.count))].filter(Boolean).join(' · ');
    }
  };

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Txt style={styles.emptyText}>{t.noRows}</Txt>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {rows.slice(0, limit).map((row, i) => (
        <View key={`${i}:${row.name}`} style={[styles.row, i > 0 && styles.divider]}>
          <View style={styles.body}>
            <Txt style={styles.name} numberOfLines={2}>
              {row.name}
            </Txt>
            <Txt style={styles.meta} numberOfLines={2}>
              {detail(row)}
            </Txt>
          </View>
          <View style={styles.right}>
            <Txt style={styles.amount}>{money(row.amount)}</Txt>
            <Txt style={styles.percent}>{`${num(Math.round((row.percent ?? 0) * 10) / 10)}%`}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
  right: { flexShrink: 0, alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  percent: { fontSize: 12, color: Zinc[500] },
  empty: { paddingVertical: 24, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
