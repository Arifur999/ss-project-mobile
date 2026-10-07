import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';

export type TotalRow = { label: string; value: string };

/** A bordered list of totals, each label against its figure, closed by a shaded grand-total row when there is one. */
export function TotalsList({ rows, grand }: { rows: TotalRow[]; grand?: TotalRow }) {
  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <View key={`${i}:${row.label}`} style={[styles.row, i > 0 && styles.divider]}>
          <Txt style={styles.label}>{row.label}</Txt>
          <Txt style={styles.value}>{row.value}</Txt>
        </View>
      ))}
      {grand ? (
        <View style={[styles.row, rows.length > 0 && styles.divider, styles.grand]}>
          <Txt style={styles.grandLabel}>{grand.label}</Txt>
          <Txt style={styles.grandValue}>{grand.value}</Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 14, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  label: { flex: 1, fontSize: 14, color: Zinc[600] },
  value: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  grand: { backgroundColor: Zinc[100] },
  grandLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Zinc[900] },
  grandValue: { fontSize: 15, fontWeight: '700', color: Zinc[900] },
});
