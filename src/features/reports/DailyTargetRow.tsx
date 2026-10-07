import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { Blue, Green, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { dateLabel } from '@/lib/dates';
import type { DailyPerformanceRow } from '@/lib/reportSummary';

/** One day of the performance series: its target against what sold, with that day's profit and expense. */
export function DailyTargetRow({ day, first, isToday }: { day: DailyPerformanceRow; first: boolean; isToday: boolean }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const percent = day.target > 0 ? Math.min(100, (day.sales / day.target) * 100) : day.sales > 0 ? 100 : 0;
  return (
    <View style={[styles.row, !first && styles.divider, isToday && styles.today]}>
      <View style={styles.top}>
        <Txt style={styles.date}>{isToday ? `${dateLabel(day.date, lang)} · ${t.today}` : dateLabel(day.date, lang)}</Txt>
        <Txt style={styles.figures} numberOfLines={1}>{`${t.sold} ${money(day.sales)} / ${money(day.target)}`}</Txt>
      </View>
      <ProgressBar percent={percent} color={day.target > 0 && day.sales >= day.target ? Green[500] : Zinc[900]} track={Zinc[200]} height={6} />
      <Txt style={styles.meta} numberOfLines={1}>{`${t.profit} ${money(day.profit)} · ${t.expenses} ${money(day.expense)}`}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  today: { backgroundColor: Blue[50] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  date: { flex: 1, fontSize: 13, fontWeight: '600', color: Zinc[900] },
  figures: { flexShrink: 0, maxWidth: '62%', fontSize: 13, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
});
