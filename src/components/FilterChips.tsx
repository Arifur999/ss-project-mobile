import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/**
 * A scrolling row of 40-tall filter chips - the account filter on Balance and
 * the period chips on the ledger. The chosen one is solid black.
 * `bleed` lets the row run to the screen edges past a 20px page padding.
 */
export function FilterChips<K extends string>({
  options,
  selected,
  onSelect,
  label,
  bleed = false,
}: {
  options: { key: K; label: string }[];
  selected: K;
  onSelect: (key: K) => void;
  label: string;
  bleed?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={bleed ? styles.bleed : undefined}
      contentContainerStyle={[styles.row, bleed && styles.bleedContent]}>
      {options.map((option) => {
        const on = option.key === selected;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(option.key)}
            style={[styles.chip, on ? styles.on : styles.off]}>
            <Txt style={[styles.text, { color: on ? White : Zinc[700] }]}>{option.label}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  bleed: { marginHorizontal: -20 },
  bleedContent: { paddingHorizontal: 20 },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  on: { backgroundColor: Zinc[900], borderColor: Zinc[900] },
  off: { backgroundColor: White, borderColor: Zinc[200] },
  text: { fontSize: 13, fontWeight: '600' },
});
