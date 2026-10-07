import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DamageEntryCard } from '@/features/damage/DamageEntryCard';
import { DamageShell } from '@/features/damage/DamageShell';
import { useEntryActions } from '@/features/damage/useEntryActions';
import { useCan } from '@/hooks/useCan';
import { damageMoney, damageStats } from '@/lib/damageSummary';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { useDamageData } from '@/services/damage.services';

/** What broke, what came back and what it cost - Hatim's Damage Dashboard. */
export default function DamageOverviewScreen() {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const can = useCan();
  const { data } = useDamageData();
  const actions = useEntryActions();
  const [period, setPeriod] = useState<ListPeriod>('all');

  const range = listRange(period);
  const entries = (data?.entries ?? []).filter((entry) => inRange(entry.date, range));
  const stats = damageStats(entries);
  // As on the website, the money is every damage transaction, whatever the period.
  const cash = damageMoney(data?.money ?? []);

  const moneyRows = [
    { label: t.repairsPaid, value: cash.paidOut, color: Red[600] },
    { label: t.writtenOff, value: cash.writtenOff, color: Red[600] },
    { label: t.recovered, value: cash.cameIn, color: Green[700] },
  ];

  return (
    <DamageShell section="overview" fab={can('damage.write') ? { label: t.recordDamage, onPress: () => router.push('/more/damage/new') } : null}>
      <FilterChips label={t.periodLabel} selected={period} onSelect={setPeriod} options={LIST_PERIODS.map((key) => ({ key, label: t.periods[key] }))} />

      <View style={styles.grid}>
        <View style={styles.row}>
          <FigureCard label={t.piecesDamaged} value={formatNumber(stats.pieces, lang)} caption={t.inPeriod} />
          <FigureCard label={t.valueOut} value={money(stats.valueOut)} caption={t.atCost} />
        </View>
        <View style={styles.row}>
          <FigureCard label={t.stillOut} value={formatNumber(stats.stillOut, lang)} caption={t.notBack} />
          <FigureCard
            dark
            label={t.netCost}
            value={money(cash.net)}
            caption={t.netHint}
            valueColor={cash.net > 0 ? Red[300] : Green[300]}
            badge={{ icon: 'wrench', bg: 'rgba(255, 255, 255, 0.12)', ink: White }}
          />
        </View>
      </View>

      <View style={styles.money}>
        {moneyRows.map((row, i) => (
          <View key={row.label} style={[styles.moneyRow, i > 0 && styles.divider]}>
            <Txt style={styles.moneyLabel}>{row.label}</Txt>
            <Txt style={[styles.moneyValue, { color: row.color }]}>{money(row.value)}</Txt>
          </View>
        ))}
      </View>

      <Txt accessibilityRole="header" style={styles.title}>
        {t.latest}
      </Txt>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.nothingInPeriod}</Txt>
        </View>
      ) : (
        entries.slice(0, 10).map((entry) => <DamageEntryCard key={entry.id} entry={entry} onPress={actions.open} />)
      )}
      {actions.sheets}
    </DamageShell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  money: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  moneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  moneyLabel: { flex: 1, fontSize: 14, color: Zinc[700] },
  moneyValue: { fontSize: 15, fontWeight: '700' },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
