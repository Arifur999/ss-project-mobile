import { StyleSheet, View } from 'react-native';

import { FigureRow } from '@/components/FiguresCard';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import type { DailyPerformanceRow } from '@/lib/reportSummary';

/**
 * Today against the owner's rolling target: the bar set this morning, what has
 * sold, what the month still needs, and what tomorrow is being asked for.
 */
export function TodayTargetCard({ day }: { day: DailyPerformanceRow }) {
  const t = useCopy(REPORT_COPY);
  const { money } = useAmountShield();
  return (
    <View style={styles.card}>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.today}
      </Txt>
      <FigureRow
        figures={[
          { label: t.todayTarget, value: money(day.target), strong: true },
          { label: t.soldToday, value: money(day.sales) },
        ]}
      />
      <FigureRow
        figures={[
          { label: t.leftThisMonth, value: money(day.remainingTarget) },
          { label: t.tomorrow, value: day.nextTarget === null ? '-' : money(day.nextTarget) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 2, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  title: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
});
