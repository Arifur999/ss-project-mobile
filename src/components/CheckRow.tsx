import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/**
 * A row picked or dropped by a tap: a tick box, a name and a line under it,
 * and a figure at the end when there is one - the recipient pickers.
 */
export function CheckRow({
  title,
  meta,
  metaMuted = false,
  end,
  checked,
  onPress,
  label,
}: {
  title: string;
  meta: string;
  /** The line under the name greyed - something is missing from it. */
  metaMuted?: boolean;
  end?: string;
  checked: boolean;
  onPress: () => void;
  /** For screen readers. */
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, checked && styles.rowOn, pressed && styles.pressed]}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <DesignIcon name="check" size={14} color={White} strokeWidth={3} /> : null}</View>
      <View style={styles.body}>
        <Txt style={styles.name} numberOfLines={1}>
          {title}
        </Txt>
        <Txt style={[styles.meta, metaMuted && styles.muted]} numberOfLines={1}>
          {meta}
        </Txt>
      </View>
      {end ? <Txt style={styles.end}>{end}</Txt> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    backgroundColor: White,
  },
  rowOn: { borderColor: Zinc[900] },
  pressed: { backgroundColor: Zinc[50] },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Zinc[400], alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Zinc[900], borderColor: Zinc[900] },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
  muted: { color: Zinc[400] },
  end: { flexShrink: 0, fontSize: 14, fontWeight: '600', color: Zinc[900] },
});
