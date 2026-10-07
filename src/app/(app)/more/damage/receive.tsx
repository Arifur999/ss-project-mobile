import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DamageShell } from '@/features/damage/DamageShell';
import { PendingLineCard } from '@/features/damage/PendingLineCard';
import { ReceiveSheet, type PendingLine } from '@/features/damage/ReceiveSheet';
import { useCan } from '@/hooks/useCan';
import { pendingLines } from '@/lib/damageSummary';
import { matches } from '@/lib/search';
import { formatNumber } from '@/lib/money';
import { useDamageData } from '@/services/damage.services';

/** What is still out, and taking it back - Hatim's Damage Receive. */
export default function DamageReceiveScreen() {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const can = useCan();
  const { data } = useDamageData();

  // Opened from an entry's Receive: start searched to that entry.
  const params = useLocalSearchParams<{ search?: string }>();
  const [search, setSearch] = useState(params.search ?? '');
  const [seededFrom, setSeededFrom] = useState(params.search ?? '');
  if ((params.search ?? '') !== seededFrom) {
    setSeededFrom(params.search ?? '');
    if (params.search) setSearch(params.search);
  }
  const [selected, setSelected] = useState<PendingLine | null>(null);

  const lines = pendingLines(data?.entries ?? []).filter((line) =>
    matches(search, line.entry.doc_no, line.item.product_name, line.item.product_code, line.entry.supplier_name),
  );
  const piecesOut = lines.reduce((sum, line) => sum + line.outstanding, 0);
  const mayReceive = can('damage.receive');

  return (
    <DamageShell section="receive">
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchReceive} label={t.searchLabel} />
      <Txt style={styles.count}>{t.piecesOut(piecesOut, formatNumber(piecesOut, lang))}</Txt>
      {lines.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.nothingOut}</Txt>
        </View>
      ) : (
        lines.map((line) => (
          <PendingLineCard key={line.item.id} line={line} onPress={mayReceive ? () => setSelected(line) : undefined} />
        ))
      )}
      <ReceiveSheet line={selected} employees={data?.employees ?? []} onClose={() => setSelected(null)} />
    </DamageShell>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
