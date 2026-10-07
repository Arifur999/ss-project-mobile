import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Blue, White, Zinc } from '@/constants/theme';

export type Figure = { label: string; value: string; strong?: boolean };

/**
 * A line of goods in a list - a damaged piece still out, a purchase line
 * still to arrive: what it is, where it came from, an optional status badge,
 * and a row of small figures under a hairline. Tappable only when the user
 * may act on it.
 */
export function FiguresCard({
  title,
  meta,
  sub,
  figures,
  badge,
  onPress,
}: {
  title: string;
  meta: string;
  sub?: string;
  figures: Figure[];
  badge?: { label: string; bg: string; ink: string };
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Txt style={styles.title} numberOfLines={2}>
          {title}
        </Txt>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Txt style={[styles.badgeText, { color: badge.ink }]}>{badge.label}</Txt>
          </View>
        ) : null}
      </View>
      <Txt style={styles.meta} numberOfLines={1}>
        {meta}
      </Txt>
      {sub ? (
        <Txt style={styles.sub} numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
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
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  badge: { flexShrink: 0, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  meta: { fontSize: 13, color: Zinc[600] },
  sub: { fontSize: 13, color: Zinc[500] },
  figures: { flexDirection: 'row', gap: 6, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Zinc[100] },
  figure: { flex: 1, minWidth: 0 },
  figLabel: { fontSize: 11, color: Zinc[500] },
  figValue: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  strong: { color: Blue[700] },
});
