import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';
import { cashflowTop, smoothPath } from '@/lib/chartMath';
import type { CashflowDay } from '@/lib/dashboard';
import { dayMonthLabel, weekdayDateLabel } from '@/lib/dates';
import { tickLabel } from '@/lib/money';

const AXIS = 36; // room left of the plot for the tick labels
const PLOT_H = 120;
const FIGURE_H = 146;

/** Money in against money out over the last seven days; tap a day to read it. */
export function CashflowCard({ days }: { days: CashflowDay[] }) {
  const t = useCopy(DASHBOARD_COPY);
  const { lang } = useLang();
  const { money, hidden } = useAmountShield();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState(-1);

  const plotW = Math.max(0, width - AXIS);
  const top = cashflowTop(Math.max(0, ...days.map((d) => Math.max(d.moneyIn, d.moneyOut))));
  const xs = days.map((_, i) => (days.length > 1 ? (i * plotW) / (days.length - 1) : 0));
  const yOf = (v: number) => PLOT_H - (v / top) * PLOT_H;
  const sum = (key: 'moneyIn' | 'moneyOut') => days.reduce((s, d) => s + d[key], 0);
  const hasDay = picked >= 0 && picked < days.length;
  const shownIn = hasDay ? days[picked].moneyIn : sum('moneyIn');
  const shownOut = hasDay ? days[picked].moneyOut : sum('moneyOut');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt style={styles.title}>{t.cashflow}</Txt>
        <Txt style={styles.sub}>{t.cashflowSub}</Txt>
      </View>

      <View style={styles.tiles}>
        <Tile color={Green[500]} label={t.moneyIn} value={money(shownIn)} />
        <Tile color={Red[500]} label={t.moneyOut} value={money(shownOut)} />
      </View>

      <Txt style={styles.sub}>{hasDay ? weekdayDateLabel(days[picked].date, lang) : t.cashflowHint}</Txt>

      <View style={styles.figure} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.grid, styles.dashed, { top: 0 }]} />
        <View style={[styles.grid, styles.dashed, { top: PLOT_H / 2 }]} />
        <View style={[styles.grid, styles.baseline, { top: PLOT_H }]} />
        {!hidden &&
          [top, top / 2, 0].map((v, i) => (
            <Txt key={i} style={[styles.yLabel, { top: (i * PLOT_H) / 2 - 9 }]}>
              {tickLabel(v)}
            </Txt>
          ))}

        {width > 0 ? (
          <Svg width={plotW + 4} height={PLOT_H + 4} viewBox={`-2 -2 ${plotW + 4} ${PLOT_H + 4}`} style={styles.svg}>
            <Path d={smoothPath(xs, days.map((d) => yOf(d.moneyIn)))} stroke={Green[500]} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={smoothPath(xs, days.map((d) => yOf(d.moneyOut)))} stroke={Red[500]} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}

        {hasDay && width > 0 ? (
          <>
            <View pointerEvents="none" style={[styles.marker, { left: Math.round(AXIS + xs[picked]) }]} />
            <View pointerEvents="none" style={[styles.dot, { backgroundColor: Green[500], left: Math.round(AXIS + xs[picked] - 5), top: Math.round(yOf(days[picked].moneyIn) - 5) }]} />
            <View pointerEvents="none" style={[styles.dot, { backgroundColor: Red[500], left: Math.round(AXIS + xs[picked] - 5), top: Math.round(yOf(days[picked].moneyOut) - 5) }]} />
          </>
        ) : null}

        {width > 0 &&
          days.map((d, i) => (
            <View key={d.date} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              <Txt style={[styles.xLabel, { left: Math.round(AXIS + xs[i] - 20), color: i === picked ? White : 'rgba(255, 255, 255, 0.6)' }]}>
                {dayMonthLabel(d.date, lang)}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: i === picked }}
                accessibilityLabel={t.dayAria(weekdayDateLabel(d.date, lang), money(d.moneyIn), money(d.moneyOut))}
                onPress={() => setPicked((p) => (p === i ? -1 : i))}
                style={[styles.hit, { left: Math.round(AXIS + xs[i] - 22.5) }]}
              />
            </View>
          ))}
      </View>
    </View>
  );
}

function Tile({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileLabel}>
        <View style={[styles.legend, { backgroundColor: color }]} />
        <Txt style={styles.tileLabelText}>{label}</Txt>
      </View>
      <Txt style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 20, borderRadius: 20, backgroundColor: Zinc[950] },
  head: { gap: 2 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: White },
  sub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.72)' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legend: { width: 8, height: 8, borderRadius: 999 },
  tileLabelText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.78)' },
  tileValue: { fontSize: 17, fontWeight: '600', color: White },
  figure: { height: FIGURE_H },
  grid: { position: 'absolute', left: AXIS, right: 0, height: 1 },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.14)' },
  baseline: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  yLabel: { position: 'absolute', left: 0, width: 30, textAlign: 'right', fontSize: 11, lineHeight: 18, color: 'rgba(255, 255, 255, 0.6)' },
  svg: { position: 'absolute', left: AXIS - 2, top: -2 },
  marker: { position: 'absolute', top: 0, height: PLOT_H, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 999, borderWidth: 2, borderColor: Zinc[950] },
  xLabel: { position: 'absolute', top: 128, width: 40, textAlign: 'center', fontSize: 11, lineHeight: 18 },
  hit: { position: 'absolute', top: 0, height: FIGURE_H, width: 45 },
});
