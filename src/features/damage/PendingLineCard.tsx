import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Blue, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import type { PendingLine } from '@/features/damage/ReceiveSheet';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';

/**
 * A line still out: the product, which entry sent it and when, what for, and
 * how many went, came back and are still to come - with what each cost.
 * Tappable only for whoever may receive it.
 */
export function PendingLineCard({ line, onPress }: { line: PendingLine; onPress?: () => void }) {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const num = (n: unknown) => formatNumber(n, lang);
  const figures = [
    { label: t.out, value: num(line.item.qty) },
    { label: t.backLabel, value: num(line.item.received_qty) },
    { label: t.still, value: num(line.outstanding), strong: true },
    { label: t.unitCostLabel, value: money(line.item.unit_cost) },
  ];

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Txt style={styles.name} numberOfLines={2}>
        {line.item.product_name}
      </Txt>
      <Txt style={styles.meta} numberOfLines={1}>
        {[line.item.product_code, line.entry.doc_no, t.sent(dateLabel(String(line.entry.date || ''), lang))].filter(Boolean).join(' · ')}
      </Txt>
      <Txt style={styles.for} numberOfLines={1}>
        {[t.actions[line.entry.action]?.label, line.entry.supplier_name].filter(Boolean).join(' · ')}
      </Txt>
      <View style={styles.figures}>
        {figures.map((f) => (
          <View key={f.label} style={styles.figure}>
            <Txt style={styles.figLabel} numberOfLines={1}>
              {f.label}
            </Txt>
            <Txt style={[styles.figValue, f.strong && styles.strong]} numberOfLines={1} adjustsFontSizeToFit>
              {f.value}
            </Txt>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  name: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  meta: { fontSize: 13, color: Zinc[600] },
  for: { fontSize: 13, color: Zinc[500] },
  figures: { flexDirection: 'row', gap: 6, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Zinc[100] },
  figure: { flex: 1, minWidth: 0 },
  figLabel: { fontSize: 11, color: Zinc[500] },
  figValue: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  strong: { color: Blue[700] },
});
