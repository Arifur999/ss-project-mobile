import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FiguresCard } from '@/components/FiguresCard';
import { FilterChips } from '@/components/FilterChips';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { PurchaseShell } from '@/features/purchase/PurchaseShell';
import { ReceiveLineSheet, type PurchaseLine } from '@/features/purchase/ReceiveLineSheet';
import { RECEIVE_LOOK } from '@/features/purchase/status';
import { useCan } from '@/hooks/useCan';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { receivedOf, receiveState, type ReceiveState } from '@/lib/purchaseOrder';
import { matches } from '@/lib/search';
import { supplierLabel, useSupplierData } from '@/services/supplier.services';

type StateFilter = 'all' | ReceiveState;
type Line = PurchaseLine & { state: ReceiveState };
const STATES: StateFilter[] = ['pending', 'partial', 'received', 'all'];
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/**
 * Every purchase line and how much of it has arrived - Hatim's Product
 * Received. Opens on what is still pending, since taking delivery is the job
 * here; a line with something due opens to the receive sheet.
 */
export default function PurchaseReceiveScreen() {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const can = useCan();
  const { data } = useSupplierData();
  const [search, setSearch] = useState('');
  const [state, setState] = useState<StateFilter>('pending');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<PurchaseLine | null>(null);

  const num = (n: unknown) => formatNumber(n, lang);
  const nameOf = (supplierId: string, fallback: string) => supplierLabel(data?.suppliers.find((s) => s.id === supplierId)) || fallback;

  // One row per line, newest order first - the purchases already come newest first.
  const lines: Line[] = (data?.purchases ?? []).flatMap((purchase) =>
    (purchase.purchase_items ?? []).map((item: Record<string, any>): Line => {
      const received = receivedOf(item);
      return { purchase, item, received, due: Math.max(0, Number(item.qty || 0) - received), state: receiveState(item) };
    }),
  );
  const shown = lines.filter(
    (line) =>
      (state === 'all' || line.state === state) &&
      matches(search, line.item.product_name, line.item.product_code, line.purchase.si_no, nameOf(line.purchase.supplier_id, line.purchase.supplier_name)),
  );
  const stillDue = shown.reduce((sum, line) => sum + line.due, 0);
  const mayReceive = can('purchase.receive');

  return (
    <PurchaseShell section="receive">
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchLines} label={t.searchLabel} />
      <FilterChips
        label={t.statusLabel}
        selected={state}
        onSelect={(s) => {
          setState(s);
          setLimit(PAGE);
        }}
        options={STATES.map((key) => ({ key, label: key === 'all' ? t.allStatuses : t.statuses[key] }))}
      />
      <Txt style={styles.count}>{`${t.countLines(shown.length, num(shown.length))} · ${t.stillDue(num(stillDue))}`}</Txt>

      {shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noLines}</Txt>
        </View>
      ) : (
        shown.slice(0, limit).map((line) => (
          <FiguresCard
            key={String(line.item.id)}
            title={String(line.item.product_name || '')}
            meta={[line.item.product_code, line.purchase.si_no, dateLabel(String(line.purchase.date || ''), lang)].filter(Boolean).join(' · ')}
            sub={nameOf(line.purchase.supplier_id, line.purchase.supplier_name)}
            badge={{ label: t.statuses[line.state], ...RECEIVE_LOOK[line.state] }}
            figures={[
              { label: t.ordered, value: num(line.item.qty) },
              { label: t.receivedLabel, value: num(line.received) },
              { label: t.due, value: num(line.due), strong: line.due > 0 },
              { label: t.actualDp, value: money(line.item.actual_dp) },
            ]}
            onPress={mayReceive && line.due > 0 ? () => setSelected(line) : undefined}
          />
        ))
      )}
      {shown.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <ReceiveLineSheet line={selected} onClose={() => setSelected(null)} />
    </PurchaseShell>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
