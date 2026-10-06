import { Children } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/** A menu tile: the icon in a white rounded square on grey, the label under it. */
export function MenuTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={styles.badge}>
        <DesignIcon name={icon} size={20} color={Zinc[700]} />
      </View>
      <Txt style={styles.label}>{label}</Txt>
    </Pressable>
  );
}

/**
 * Four equal columns, like the design's `repeat(4, minmax(0, 1fr))`: tiles go
 * in rows of four, and a short last row is padded so its tiles keep the width.
 */
export function MenuGrid({ children }: { children: React.ReactNode }) {
  const tiles = Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += 4) rows.push(tiles.slice(i, i + 4));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((tile, i) => (
            <View key={i} style={styles.cell}>
              {tile}
            </View>
          ))}
          {Array.from({ length: 4 - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0 },
  tile: {
    flex: 1,
    minHeight: 92,
    paddingTop: 12,
    paddingHorizontal: 2,
    paddingBottom: 10,
    borderRadius: 16,
    backgroundColor: Zinc[100],
    alignItems: 'center',
    gap: 8,
  },
  pressed: { backgroundColor: Zinc[200] },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: White,
    borderWidth: 1,
    borderColor: Zinc[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '500', lineHeight: 15.6, color: Zinc[900], textAlign: 'center' },
});
