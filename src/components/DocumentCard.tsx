import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/**
 * An invoice in a ledger - a purchase, a sale: its number, date and status
 * badge on top, then who it is with and its figures, and an optional line
 * under them.
 */
export function DocumentCard({
  number,
  date,
  badge,
  title,
  figures,
  sub,
  label,
  onPress,
}: {
  number: string;
  date: string;
  badge: { label: string; bg: string; ink: string };
  title: string;
  figures: string;
  sub?: string;
  /** For screen readers. */
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Txt style={styles.number}>{number}</Txt>
        <Txt style={styles.date}>{date}</Txt>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Txt style={[styles.badgeText, { color: badge.ink }]}>{badge.label}</Txt>
        </View>
      </View>
      <View style={styles.bottom}>
        <Txt style={styles.title} numberOfLines={1}>
          {title}
        </Txt>
        <Txt style={styles.figures}>{figures}</Txt>
      </View>
      {sub ? (
        <Txt style={styles.sub} numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  number: { fontSize: 14, fontWeight: '700', color: Zinc[900] },
  date: { flex: 1, fontSize: 12, color: Zinc[500] },
  badge: { paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  figures: { flexShrink: 0, fontSize: 13, fontWeight: '600', color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[600] },
});
