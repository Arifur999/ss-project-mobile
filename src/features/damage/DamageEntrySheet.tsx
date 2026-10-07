import { StyleSheet, View } from 'react-native';

import { ActionsSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { outstandingQty } from '@/lib/damageRules';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { DamageEntry } from '@/services/damage.services';

/**
 * An entry opened from a list: each line with its quantity, FIFO cost and how
 * many are back, the supplier and notes - then Receive while something is
 * still out, and Delete, for whoever may.
 */
export function DamageEntrySheet({
  entry,
  onClose,
  onReceive,
  onDelete,
}: {
  entry: DamageEntry | null;
  onClose: () => void;
  onReceive?: () => void;
  onDelete?: () => void;
}) {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const num = (n: unknown) => formatNumber(n, lang);
  const items = entry?.damage_items ?? [];
  const anyOut = items.some((item) => outstandingQty(item) > 0);

  return (
    <ActionsSheet
      open={!!entry}
      onClose={onClose}
      title={entry?.doc_no ?? ''}
      subtitle={[
        dateLabel(String(entry?.date || ''), lang),
        entry ? t.sources[entry.source]?.label : '',
        entry ? t.actions[entry.action]?.label : '',
        entry?.supplier_name,
      ]
        .filter(Boolean)
        .join(' · ')}
      cancelLabel={t.close}
      closeLabel={t.close}
      deleteLabel={t.deleteEntry}
      onDelete={onDelete}
      extra={anyOut && onReceive ? [{ label: t.receive, icon: 'download', onPress: onReceive }] : []}>
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.line, i > 0 && styles.divider]}>
            <View style={styles.lineBody}>
              <Txt style={styles.name}>{item.product_name}</Txt>
              <Txt style={styles.meta}>{t.line(num(item.qty), money(item.unit_cost), money(item.total_cost))}</Txt>
            </View>
            <Txt style={styles.back}>{t.backOf(num(item.received_qty), num(item.qty))}</Txt>
          </View>
        ))}
      </View>
      {entry?.notes ? <Txt style={styles.notes}>{entry.notes}</Txt> : null}
    </ActionsSheet>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 14, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  lineBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
  back: { flexShrink: 0, fontSize: 12, fontWeight: '600', color: Zinc[700] },
  notes: { fontSize: 14, color: Zinc[700] },
});
