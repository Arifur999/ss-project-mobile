import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';

/**
 * One money movement in a bordered list: a red "out" or green "in" mark,
 * what it was, a line of detail (date, account, reference), an optional note,
 * and the signed amount. Tappable when the screen offers actions on it.
 */
export function MoneyLine({
  direction,
  title,
  meta,
  note,
  amount,
  first,
  onPress,
  label,
}: {
  direction: 'out' | 'in';
  title: string;
  meta: string;
  note?: string | null;
  /** Already formatted, unsigned. */
  amount: string;
  first: boolean;
  onPress?: () => void;
  /** For screen readers, when the row opens something. */
  label?: string;
}) {
  const out = direction === 'out';
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.item, !first && styles.divider, pressed && styles.pressed]}>
      <View style={[styles.mark, { backgroundColor: out ? Red[50] : Green[50] }]}>
        <DesignIcon name={out ? 'arrowUpRight' : 'arrowDownLeft'} size={18} color={out ? Red[700] : Green[700]} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Txt style={styles.title} numberOfLines={1}>
          {title}
        </Txt>
        <Txt style={styles.meta} numberOfLines={1}>
          {meta}
        </Txt>
        {note ? (
          <Txt style={styles.note} numberOfLines={2}>
            {note}
          </Txt>
        ) : null}
      </View>
      <Txt style={[styles.amount, { color: out ? Red[600] : Green[700] }]}>{`${out ? '−' : '+'}${amount}`}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  pressed: { backgroundColor: Zinc[50] },
  mark: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 13, color: Zinc[600] },
  note: { fontSize: 12, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600' },
});
