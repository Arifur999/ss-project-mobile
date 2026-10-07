import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DAMAGE_STATUS_LOOK } from '@/features/damage/status';
import { entryTotals } from '@/lib/damageSummary';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import type { DamageEntry } from '@/services/damage.services';

/**
 * A damage entry in a list: its number and date, what broke, how many and
 * what they cost, where from and what happens next, and its status.
 */
export const DamageEntryCard = memo(function DamageEntryCard({ entry, onPress }: { entry: DamageEntry; onPress: (entry: DamageEntry) => void }) {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const totals = entryTotals(entry);
  const look = DAMAGE_STATUS_LOOK[entry.status] ?? DAMAGE_STATUS_LOOK.pending;
  const products = entry.damage_items.map((item) => item.product_name).join(', ');
  const how = [t.sources[entry.source]?.label, t.actions[entry.action]?.label, entry.supplier_name].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.doc_no}, ${products}, ${t.statuses[entry.status]}`}
      onPress={() => onPress(entry)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Txt style={styles.doc}>{entry.doc_no}</Txt>
        <Txt style={styles.date}>{dateLabel(String(entry.date || ''), lang)}</Txt>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Txt style={[styles.badgeText, { color: look.ink }]}>{t.statuses[entry.status]}</Txt>
        </View>
      </View>
      <Txt style={styles.products} numberOfLines={2}>
        {products}
      </Txt>
      <View style={styles.bottom}>
        <Txt style={styles.how} numberOfLines={1}>
          {how}
        </Txt>
        <Txt style={styles.figures}>{`${t.pcs(formatNumber(totals.qty, lang))} · ${money(totals.value)}`}</Txt>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doc: { fontSize: 13, fontWeight: '700', color: Zinc[900] },
  date: { flex: 1, fontSize: 12, color: Zinc[500] },
  badge: { paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  products: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  how: { flex: 1, minWidth: 0, fontSize: 13, color: Zinc[600] },
  figures: { flexShrink: 0, fontSize: 13, fontWeight: '600', color: Zinc[900] },
});
