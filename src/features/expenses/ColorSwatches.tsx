import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { CategoryPalette, White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';

/**
 * The category colour picker: the website's ten colours in two rows of five,
 * the chosen one ringed in white then black with a tick.
 */
export function ColorSwatches({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const t = useCopy(EXPENSE_COPY);
  const rows = [CategoryPalette.slice(0, 5), CategoryPalette.slice(5)];
  return (
    <View style={styles.wrap}>
      <Txt style={styles.label}>{t.color}</Txt>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.color} style={styles.grid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((hex, i) => {
              const selected = value.toLowerCase() === hex;
              return (
                <Pressable
                  key={hex}
                  accessibilityRole="radio"
                  accessibilityLabel={t.colors[r * 5 + i]}
                  accessibilityState={{ checked: selected }}
                  onPress={() => onChange(hex)}
                  style={styles.cell}>
                  <View style={[styles.ring, selected && styles.ringOn]}>
                    <View style={[styles.gap, selected && styles.gapOn]}>
                      <View style={[styles.swatch, { backgroundColor: hex }]}>
                        {selected ? <DesignIcon name="check" size={16} color={White} strokeWidth={3} /> : null}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  grid: { gap: 4 },
  row: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // 32px swatch, then (when chosen) a 2px white gap and a 2px black ring - the design's box-shadow.
  ring: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ringOn: { backgroundColor: Zinc[900] },
  gap: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  gapOn: { backgroundColor: White },
  swatch: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
