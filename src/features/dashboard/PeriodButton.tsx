import { CalendarDays, ChevronDown } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/** "This Month · 01 – 30 Sep 2026 ⌄" - opens the period sheet. */
export function PeriodButton({ name, range, onPress }: { name: string; range: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={range}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <CalendarDays size={18} color={Zinc[900]} strokeWidth={1.8} />
      <Txt style={styles.name}>{name}</Txt>
      <Txt style={styles.range} numberOfLines={1}>
        {`· ${range}`}
      </Txt>
      <ChevronDown size={18} color={Zinc[900]} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    borderRadius: 14,
    backgroundColor: White,
  },
  pressed: { backgroundColor: Zinc[100] },
  name: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  range: { flex: 1, minWidth: 0, fontSize: 14, color: Zinc[500] },
});
