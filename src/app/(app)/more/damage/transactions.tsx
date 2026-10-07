import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DamageMoneySheet } from '@/features/damage/DamageMoneySheet';
import { DamageShell } from '@/features/damage/DamageShell';
import { useCan } from '@/hooks/useCan';
import { damageMoney, matches } from '@/lib/damageSummary';
import { dateLabel } from '@/lib/dates';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { useDamageData, type DamageMoney } from '@/services/damage.services';

/** The money either side of a breakage - Hatim's Damage Transactions: repairs paid, refunds, write-offs. */
export default function DamageTransactionsScreen() {
  const t = useCopy(DAMAGE_COPY);
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
            <MoneyRow key={`${row.direction}:${row.id}`} row={row} doc={docNo.get(row.entry_id) ?? ''} first={i === 0} />
          ))}
        </View>
      )}
      <DamageMoneySheet open={adding} onClose={() => setAdding(false)} />
    </DamageShell>
  );
}

function MoneyRow({ row, doc, first }: { row: DamageMoney; doc: string; first: boolean }) {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const out = row.direction === 'out';
  return (
    <View style={[styles.item, !first && styles.divider]}>
      <View style={[styles.mark, { backgroundColor: out ? Red[50] : Green[50] }]}>
        <DesignIcon name={out ? 'arrowUpRight' : 'arrowDownLeft'} size={18} color={out ? Red[700] : Green[700]} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Txt style={styles.label} numberOfLines={1}>
          {row.label || (out ? t.writtenOff : t.recovered)}
        </Txt>
        <Txt style={styles.meta} numberOfLines={1}>
          {[doc, dateLabel(row.date, lang), row.account_name || t.noCash].filter(Boolean).join(' · ')}
        </Txt>
        {row.notes ? (
          <Txt style={styles.notes} numberOfLines={2}>
            {row.notes}
          </Txt>
        ) : null}
      </View>
      <Txt style={[styles.amount, { color: out ? Red[600] : Green[700] }]}>{`${out ? '−' : '+'}${money(row.amount)}`}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  mark: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 13, color: Zinc[600] },
  notes: { fontSize: 12, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600' },
});
