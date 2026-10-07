import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { MoneyLine } from '@/components/MoneyLine';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DamageMoneySheet } from '@/features/damage/DamageMoneySheet';
import { DamageShell } from '@/features/damage/DamageShell';
import { useCan } from '@/hooks/useCan';
import { damageMoney } from '@/lib/damageSummary';
import { matches } from '@/lib/search';
import { dateLabel } from '@/lib/dates';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { useDamageData } from '@/services/damage.services';

/** The money either side of a breakage - Hatim's Damage Transactions: repairs paid, refunds, write-offs. */
export default function DamageTransactionsScreen() {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const can = useCan();
  const { money } = useAmountShield();
  const { data } = useDamageData();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [adding, setAdding] = useState(false);

  const docNo = new Map((data?.entries ?? []).map((entry) => [entry.id, entry.doc_no]));
  const range = listRange(period);
  const rows = (data?.money ?? []).filter(
    (row) => inRange(row.date, range) && matches(search, docNo.get(row.entry_id), row.label, row.account_name, row.notes),
  );
  // As the website's page totals it: everything that went out - write-offs too - against what came back.
  const totals = damageMoney(rows);
  const paidOut = totals.paidOut + totals.writtenOff;

  return (
    <DamageShell section="transactions" fab={can('damage.money') ? { label: t.addMoney, onPress: () => setAdding(true) } : null}>
      <View style={styles.row}>
        <FigureCard label={t.paidOut} value={money(paidOut)} valueColor={Red[600]} />
        <FigureCard label={t.recovered} value={money(totals.cameIn)} valueColor={Green[700]} />
      </View>
      <FigureCard dark label={t.netShort} value={money(totals.net)} caption={t.netHint} />

      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchMoney} label={t.searchLabel} />
      <FilterChips label={t.periodLabel} selected={period} onSelect={setPeriod} options={LIST_PERIODS.map((key) => ({ key, label: t.periods[key] }))} />

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noMoney}</Txt>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.map((row, i) => (
            <MoneyLine
              key={`${row.direction}:${row.id}`}
              direction={row.direction}
              title={row.label || (row.direction === 'out' ? t.writtenOff : t.recovered)}
              meta={[docNo.get(row.entry_id), dateLabel(row.date, lang), row.account_name || t.noCash].filter(Boolean).join(' · ')}
              note={row.notes}
              amount={money(row.amount)}
              first={i === 0}
            />
          ))}
        </View>
      )}
      <DamageMoneySheet open={adding} onClose={() => setAdding(false)} />
    </DamageShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
});
