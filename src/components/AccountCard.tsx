import { Pressable, StyleSheet, View } from 'react-native';

import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { SIDE_LOOK, sideOf } from '@/constants/side';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';

/**
 * Someone with a running account - a supplier, a customer: who, where the
 * account stands (signed: positive is Pawna, negative Dena) with its side's
 * colour, and a line of figures under a hairline.
 */
export function AccountCard({
  name,
  sub,
  balance,
  sideLabels,
  figures,
  onPress,
}: {
  name: string;
  sub?: string | null;
  balance: number;
  sideLabels: Record<'pawna' | 'dena' | 'balanced', string>;
  /** Already worded and formatted. */
  figures: string[];
  onPress: () => void;
}) {
  const { money } = useAmountShield();
  const side = sideOf(balance);
  const look = SIDE_LOOK[side];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${money(Math.abs(balance))} ${sideLabels[side]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Initial name={name} size={40} tone="soft" />
        <View style={styles.who}>
          <Txt style={styles.name} numberOfLines={2}>
            {name}
          </Txt>
          {sub ? (
            <Txt style={styles.sub} numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        <View style={styles.standing}>
          <Txt style={[styles.balance, { color: look.amount }]} numberOfLines={1}>
            {money(Math.abs(balance))}
          </Txt>
          <View style={[styles.chip, { backgroundColor: look.chipBg }]}>
            <Txt style={[styles.chipText, { color: look.chipInk }]}>{sideLabels[side]}</Txt>
          </View>
        </View>
      </View>
      <View style={styles.figures}>
        {figures.map((figure) => (
          <Txt key={figure} style={styles.figure} numberOfLines={1}>
            {figure}
          </Txt>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[500] },
  standing: { flexShrink: 0, maxWidth: '42%', alignItems: 'flex-end', gap: 4 },
  balance: { fontSize: 16, fontWeight: '700' },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
  figures: { flexDirection: 'row', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: Zinc[100] },
  figure: { flex: 1, minWidth: 0, fontSize: 12, color: Zinc[600] },
});
