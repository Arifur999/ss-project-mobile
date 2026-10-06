import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Blue, ChartPalette, Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { initialPeriod, PeriodPicker, periodWindow, usePeriodShort, type PeriodState } from '@/features/shareholders/PeriodPicker';
import { ShareholderShell } from '@/features/shareholders/ShareholderShell';
import { computeShareholderRows } from '@/lib/shareholders';
import { useShareholderData } from '@/services/shareholders.services';

// One colour per shareholder, in order: the design's two greys, then the
// chart palette for larger partnerships.
const SHAREHOLDER_COLORS = [Zinc[900], Zinc[500], Zinc[400], ...ChartPalette.slice(1)];

/** Capital, profit share and ownership, per shareholder, for a period. */
export default function ShareholderOverviewScreen() {
  const t = useCopy(SHAREHOLDER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const { data } = useShareholderData();
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const short = usePeriodShort(period);

  const rows = data ? computeShareholderRows(data, periodWindow(period)) : [];
  const sum = (key: 'opening' | 'periodInvested' | 'periodWithdrawn' | 'periodProfitShare' | 'retainedProfit' | 'netCapital') =>
    rows.reduce((s, r) => s + r[key], 0);
  const pct = (n: number) => {
    const text = `${n.toFixed(2)}%`;
    return lang === 'bn' ? bnDigits(text) : text;
  };
  const profit = sum('periodProfitShare');

  return (
    <ShareholderShell section="overview">
      <PeriodPicker value={period} onChange={setPeriod} />

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Tile label={t.openingCapital} value={money(sum('opening'))} />
          <Tile label={t.investmentIn(short)} value={money(sum('periodInvested'))} color={Green[700]} />
        </View>
        <View style={styles.gridRow}>
          <Tile label={t.withdrawIn(short)} value={money(sum('periodWithdrawn'))} color={Red[600]} />
          <Tile label={t.profitLossIn(short)} value={money(profit)} color={profit < 0 ? Red[600] : Green[700]} />
        </View>
        <View style={styles.gridRow}>
          <Tile label={t.retainedProfit} value={money(sum('retainedProfit'))} />
          <Tile label={t.netCapital} value={money(sum('netCapital'))} dark />
        </View>
      </View>

      {rows.length > 0 ? (
        <View style={styles.ownership}>
          <Txt accessibilityRole="header" style={styles.ownershipTitle}>
            {t.ownership}
          </Txt>
          <View
            accessibilityRole="image"
            accessibilityLabel={rows.map((r) => `${r.name} ${pct(r.sharePct)}`).join(', ')}
            style={styles.bar}>
            {rows.map((r, i) => (
              <View key={r.id} style={{ flexGrow: Math.max(r.sharePct, 0.0001), flexBasis: 0, backgroundColor: SHAREHOLDER_COLORS[i % SHAREHOLDER_COLORS.length] }} />
            ))}
          </View>
          <View style={styles.legend}>
            {rows.map((r, i) => (
              <View key={r.id} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: SHAREHOLDER_COLORS[i % SHAREHOLDER_COLORS.length] }]} />
                <Txt style={styles.legendText}>
                  {r.name} <Txt style={styles.legendPct}>{pct(r.sharePct)}</Txt>
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Txt accessibilityRole="header" style={styles.summaryTitle}>
        {t.summaryTitle}
      </Txt>

      {rows.length === 0 ? <Txt style={styles.empty}>{t.noShareholders}</Txt> : null}

      {rows.map((r, i) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.avatar, { backgroundColor: SHAREHOLDER_COLORS[i % SHAREHOLDER_COLORS.length] }]}>
              <Txt style={styles.avatarText}>{(r.name.trim().charAt(0) || '?').toUpperCase()}</Txt>
            </View>
            <View style={styles.cardWho}>
              <Txt style={styles.cardName}>{r.name}</Txt>
              <Txt style={styles.cardSub}>{t.netCapitalOf(money(r.netCapital))}</Txt>
            </View>
            <View style={styles.sharePill}>
              <Txt style={styles.shareText}>{pct(r.sharePct)}</Txt>
            </View>
          </View>
          <View style={styles.dl}>
            <Fig label={t.openingAmount} value={money(r.opening)} />
            <Fig label={t.retainedProfit} value={money(r.retainedProfit)} />
            <Fig label={t.investmentIn(short)} value={money(r.periodInvested)} color={Green[700]} />
            <Fig label={t.withdrawIn(short)} value={money(r.periodWithdrawn)} color={Red[600]} />
            <Fig label={t.profitShare} value={money(r.periodProfitShare)} color={r.periodProfitShare < 0 ? Red[600] : Green[700]} last />
            <Fig label={t.profitWithdraw} value={money(r.periodProfitWithdrawn)} color={Blue[700]} last />
          </View>
        </View>
      ))}
    </ShareholderShell>
  );
}

function Tile({ label, value, color = Zinc[900], dark = false }: { label: string; value: string; color?: string; dark?: boolean }) {
  return (
    <View style={[styles.tile, dark && styles.tileDark]}>
      <Txt style={[styles.tileLabel, dark && styles.tileLabelDark]}>{label}</Txt>
      <Txt style={[styles.tileValue, { color: dark ? White : color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

function Fig({ label, value, color = Zinc[900], last = false }: { label: string; value: string; color?: string; last?: boolean }) {
  return (
    <View style={[styles.fig, !last && styles.figDivider]}>
      <Txt style={styles.figLabel}>{label}</Txt>
      <Txt style={[styles.figValue, { color }]} numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  tileDark: { backgroundColor: Zinc[950], borderColor: Zinc[950] },
  tileLabel: { fontSize: 13, fontWeight: '500', color: Zinc[600] },
  tileLabelDark: { color: 'rgba(255, 255, 255, 0.72)' },
  tileValue: { fontSize: 19, fontWeight: '600' },
  ownership: { gap: 10, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200] },
  ownershipTitle: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  bar: { flexDirection: 'row', gap: 2, height: 12, borderRadius: 999, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 13, color: Zinc[900] },
  legendPct: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
  summaryTitle: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  empty: { paddingVertical: 24, fontSize: 14, color: Zinc[600], textAlign: 'center' },
  card: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: Zinc[100] },
  avatar: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: '700', color: White, lineHeight: 21 },
  cardWho: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  cardSub: { fontSize: 13, color: Zinc[600] },
  sharePill: { flexShrink: 0, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: White, borderWidth: 1, borderColor: Zinc[200] },
  shareText: { fontSize: 14, fontWeight: '700', color: Zinc[900] },
  dl: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 4, paddingHorizontal: 16, paddingBottom: 10, columnGap: 16 },
  fig: { width: '47%', flexGrow: 1, paddingVertical: 10 },
  figDivider: { borderBottomWidth: 1, borderBottomColor: Zinc[100] },
  figLabel: { fontSize: 12, color: Zinc[500] },
  figValue: { fontSize: 15, fontWeight: '600' },
});
