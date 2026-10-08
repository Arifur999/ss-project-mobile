import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { monthName } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { MonthRow } from '@/lib/yearlyReport';

/**
 * One month of the Yearly report's table: its sales against the month's goal
 * and its profit or loss. Tapped, it opens the month's every figure.
 */
export function YearMonthRow({ row, first, best, onPress }: { row: MonthRow; first: boolean; best: boolean; onPress: () => void }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const percent = row.salesGoal > 0 ? (row.actualSales / row.salesGoal) * 100 : 0;
  const name = monthName(row.month, lang);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.monthAria(name, money(row.actualSales), money(row.profitLoss))}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, best && styles.best, pressed && styles.pressed]}>
      <View style={styles.body}>
        <View style={styles.top}>
          <Txt style={styles.month}>{name}</Txt>
          <Txt style={[styles.result, { color: row.profitLoss < 0 ? Red[600] : Green[700] }]} numberOfLines={1}>
            {money(row.profitLoss)}
          </Txt>
        </View>
        <Txt style={styles.meta} numberOfLines={1}>
          {row.salesGoal > 0
            ? `${t.monthSales(money(row.actualSales))} · ${t.ofTarget(formatNumber(Math.round(percent * 10) / 10, lang), money(row.salesGoal))}`
            : t.monthSales(money(row.actualSales))}
        </Txt>
        {row.salesGoal > 0 ? <ProgressBar percent={percent} color={percent >= 100 ? Green[500] : Zinc[900]} track={Zinc[200]} height={6} /> : null}
      </View>
      <DesignIcon name="chevronRight" size={18} color={Zinc[400]} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  best: { backgroundColor: Green[50] },
  pressed: { backgroundColor: Zinc[50] },
  body: { flex: 1, minWidth: 0, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  month: { flex: 1, fontSize: 14, fontWeight: '600', color: Zinc[900] },
  result: { flexShrink: 0, maxWidth: '60%', fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, color: Zinc[500] },
});
