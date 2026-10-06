import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';
import { barTicks } from '@/lib/chartMath';
import type { MonthBar } from '@/lib/dashboard';
import { monthName, monthShort } from '@/lib/dates';
import { tickLabel } from '@/lib/money';

type Metric = 'sales' | 'profit' | 'expense';

const COLORS: Record<Metric, string> = { sales: Zinc[900], profit: Green[600], expense: Red[600] };
const PLOT = 140;
const AXIS = 44;

/** Sales, profit or expenses month by month for the year; tap a month to read it. */
export function SalesChartCard({ year, months }: { year: number; months: MonthBar[] }) {
  const t = useCopy(DASHBOARD_COPY);
  const { lang } = useLang();
  const { money, hidden } = useAmountShield();
  const [metric, setMetric] = useState<Metric>('sales');
  const [picked, setPicked] = useState(months.length - 1);

  const month = Math.min(Math.max(picked, 0), months.length - 1);
  const values = months.map((m) => m[metric]);
  const { max, ticks } = barTicks(Math.max(0, ...values));
  const names: Record<Metric, string> = { sales: t.sales, profit: t.profit, expense: t.expense };
  const yearText = lang === 'bn' ? bnDigits(year) : String(year);
  const current = months[month];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt style={styles.title}>{t.purchaseSales}</Txt>
        <Txt style={styles.sub}>{t.monthByMonth(year)}</Txt>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel={t.show} style={styles.segments}>
        {(['sales', 'profit', 'expense'] as Metric[]).map((id) => {
          const selected = id === metric;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setMetric(id)}
              style={[styles.segment, selected && styles.segmentOn]}>
              <View style={[styles.dot, { backgroundColor: COLORS[id] }]} />
              <Txt style={[styles.segmentText, { color: selected ? Zinc[900] : Zinc[600] }]}>{names[id]}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.readout}>
        <Txt style={styles.sub}>
          {current ? `${names[metric]} · ${monthName(current.month, lang)} ${yearText}` : names[metric]}
        </Txt>
        <Txt style={styles.value}>{money(current ? current[metric] : 0)}</Txt>
      </View>

      <View style={styles.figure}>
        {ticks.map((v) => {
          const y = Math.round(PLOT - (v / max) * PLOT);
          return (
            <View key={v} pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.tickLine, { top: y, backgroundColor: v === 0 ? Zinc[400] : Zinc[200] }]} />
              <Txt style={[styles.tickLabel, { top: y - 9 }]}>{hidden ? '' : tickLabel(v)}</Txt>
            </View>
          );
        })}
        <View style={styles.bars}>
          {months.map((m, i) => {
            const v = m[metric];
            return (
              <Pressable
                key={m.month}
                accessibilityRole="button"
                accessibilityState={{ selected: i === month }}
                accessibilityLabel={`${names[metric]}, ${monthName(m.month, lang)} ${yearText}: ${money(v)}`}
                onPress={() => setPicked(i)}
                style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: v > 0 ? Math.max(3, Math.round((v / max) * PLOT)) : 0,
                      backgroundColor: COLORS[metric],
                      opacity: i === month ? 1 : 0.35,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        <View pointerEvents="none" style={styles.monthRow}>
          {months.map((m, i) => (
            <Txt
              key={m.month}
              style={[styles.monthLabel, i === month ? styles.monthOn : styles.monthOff]}
              numberOfLines={1}>
              {monthShort(m.month, lang)}
            </Txt>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 20, borderRadius: 20, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  head: { gap: 2 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[600] },
  segments: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 12, backgroundColor: Zinc[200] },
  segment: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentOn: {
    backgroundColor: White,
    shadowColor: '#09090B',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  value: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: Zinc[900] },
  figure: { height: 166 },
  tickLine: { position: 'absolute', left: AXIS, right: 0, height: 1 },
  tickLabel: { position: 'absolute', left: 0, width: 38, textAlign: 'right', fontSize: 11, lineHeight: 18, color: Zinc[600] },
  bars: { position: 'absolute', left: AXIS, right: 0, top: 0, height: PLOT, flexDirection: 'row', alignItems: 'flex-end' },
  barSlot: { flex: 1, height: PLOT, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthRow: { position: 'absolute', left: AXIS, right: 0, top: 146, flexDirection: 'row' },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 11, lineHeight: 18 },
  monthOn: { color: Zinc[900], fontWeight: '600' },
  monthOff: { color: Zinc[600], fontWeight: '400' },
});
