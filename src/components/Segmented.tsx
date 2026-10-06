import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

export type Segment<K extends string> = {
  key: K;
  label: string;
  icon?: IconName;
  /** A small colour dot before the label (the chart metric switch). */
  dot?: string;
  /** Ink when chosen - Investment green, Withdrawal red. */
  activeInk?: string;
};

/**
 * The design's segmented switch: equal cells on a grey track, the chosen one
 * white with a hairline shadow. 40 tall with 13px labels by default; the
 * entry-type switch in the forms is 44 tall with 14px labels.
 */
export function Segmented<K extends string>({
  segments,
  value,
  onChange,
  label,
  height = 40,
  fontSize = 13,
}: {
  segments: Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  height?: number;
  fontSize?: number;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
      {segments.map((segment) => {
        const on = segment.key === value;
        const ink = on ? segment.activeInk ?? Zinc[900] : Zinc[600];
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(segment.key)}
            style={[styles.cell, { height }, on && styles.on]}>
            {segment.dot ? <View style={[styles.dot, { backgroundColor: segment.dot }]} /> : null}
            {segment.icon ? <DesignIcon name={segment.icon} size={18} color={ink} strokeWidth={2} /> : null}
            <Txt style={[styles.text, { fontSize, color: ink }]}>{segment.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 12, backgroundColor: Zinc[200] },
  cell: { flex: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  on: {
    backgroundColor: White,
    shadowColor: '#09090B',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  text: { fontWeight: '600' },
});
