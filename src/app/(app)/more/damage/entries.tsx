import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FilterChips } from '@/components/FilterChips';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DamageEntryCard } from '@/features/damage/DamageEntryCard';
import { DamageShell } from '@/features/damage/DamageShell';
import { useEntryActions } from '@/features/damage/useEntryActions';
import { useCan } from '@/hooks/useCan';
import { matches } from '@/lib/search';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { useDamageData } from '@/services/damage.services';

// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Every damage entry - Hatim's Repair / Return / Change: search, period, and recording a new one. */
export default function DamageEntriesScreen() {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const can = useCan();
  const { data } = useDamageData();
  const actions = useEntryActions();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);

  const range = listRange(period);
  const shown = (data?.entries ?? []).filter(
    (entry) =>
      inRange(entry.date, range) &&
      matches(search, entry.doc_no, entry.supplier_name, entry.damage_items.map((item) => item.product_name).join(' ')),
  );

  return (
    <DamageShell section="entries" fab={can('damage.write') ? { label: t.recordDamage, onPress: () => router.push('/more/damage/new') } : null}>
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchEntries} label={t.searchLabel} />
      <FilterChips
        label={t.periodLabel}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          setLimit(PAGE);
        }}
        options={LIST_PERIODS.map((key) => ({ key, label: t.periods[key] }))}
      />
      <Txt style={styles.count}>{t.countEntries(shown.length, formatNumber(shown.length, lang))}</Txt>

      {shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.nothingInPeriod}</Txt>
        </View>
      ) : (
        shown.slice(0, limit).map((entry) => <DamageEntryCard key={entry.id} entry={entry} onPress={actions.open} />)
      )}
      {shown.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
      {actions.sheets}
    </DamageShell>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
