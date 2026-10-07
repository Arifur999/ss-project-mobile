import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';

/**
 * Tappable suggestions under a free-text field - the website's <datalist>:
 * the values that contain what is typed (or the first few while it is empty),
 * never the one already there. Picking one fills the field, so the same
 * category is not spelled four ways.
 */
export function SuggestionChips({
  suggestions,
  value,
  onPick,
  max = 6,
}: {
  suggestions: string[];
  value: string;
  onPick: (value: string) => void;
  max?: number;
}) {
  const typed = value.trim().toLowerCase();
  const shown = suggestions
    .filter((s) => s.toLowerCase() !== typed && (!typed || s.toLowerCase().includes(typed)))
    .slice(0, max);
  if (shown.length === 0) return null;

  return (
    <View style={styles.row}>
      {shown.map((suggestion) => (
        <Pressable key={suggestion} accessibilityRole="button" onPress={() => onPick(suggestion)} style={styles.chip}>
          <Txt style={styles.text} numberOfLines={1}>
            {suggestion}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 36, maxWidth: '100%', paddingHorizontal: 12, borderRadius: 999, backgroundColor: Zinc[100], justifyContent: 'center' },
  text: { fontSize: 13, fontWeight: '500', color: Zinc[700] },
});
