import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import type { BalanceColumn } from '@/lib/balanceTabs';

type Figures = Record<string, number>;

/** Ink for a figure by the way it moves money; zero is always muted. */
export function flowInk(column: BalanceColumn, value: number, onDark = false): string {
  if (!value) return onDark ? White : Zinc[500];
  if (column.flow === 'in') return onDark ? Green[400] : Green[700];
  if (column.flow === 'out') return onDark ? Red[400] : Red[600];
  return onDark ? White : Zinc[900];
}

/**
 * One account in the overview: name and its closing figure (with the green or
 * red dot) on top, the tab's other columns three to a row underneath. Tapping
 * it opens that account's ledger, for a member who may open the Ledger.
 */
export function AccountCard({
  name,
  inactive,
  inactiveLabel,
  figures,
  columns,
  closing,
  money,
  first,
  accessibilityLabel,
  onPress,
}: {
  name: string;
  inactive: boolean;
  inactiveLabel: string;
  figures: Figures;
  columns: { column: BalanceColumn; label: string }[];
  closing: BalanceColumn;
  money: (n: number) => string;
  first: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
}) {
  const close = figures[closing.key] || 0;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.item, !first && styles.divider, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.nameRow}>
          <Txt style={styles.name}>{name}</Txt>
          {inactive ? (
            <View style={styles.badge}>
              <Txt style={styles.badgeText}>{inactiveLabel}</Txt>
            </View>
          ) : null}
        </View>
        <View style={styles.closing}>
          <Txt style={[styles.closingText, { color: close < 0 ? Red[600] : Zinc[900] }]}>{money(close)}</Txt>
          <View style={[styles.dot, { backgroundColor: close < 0 ? Red[600] : Green[600] }]} />
        </View>
      </View>
      <View style={styles.grid}>
        {columns.map(({ column, label }) => {
          const value = figures[column.key] || 0;
          return (
            <View key={column.key} style={styles.cell}>
              <Txt style={styles.cellLabel}>{label}</Txt>
              <Txt style={[styles.cellValue, { color: flowInk(column, value) }]} numberOfLines={1}>
                {money(value)}
              </Txt>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { gap: 10, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: White },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  pressed: { backgroundColor: Zinc[100] },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nameRow: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  badge: { paddingHorizontal: 8, borderRadius: 999, backgroundColor: Zinc[100] },
  badgeText: { fontSize: 12, fontWeight: '600', color: Zinc[600], lineHeight: 18 },
  closing: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  closingText: { fontSize: 15, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 999 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  cell: { width: '33.333%', paddingRight: 8 },
  cellLabel: { fontSize: 11, color: Zinc[500], lineHeight: 16.5 },
  cellValue: { fontSize: 13, fontWeight: '500' },
});
