import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Green, White, Zinc } from '@/constants/theme';

const SIZES = {
  // "Welcome SMS" / "SMS receipt": 40x24, green when on.
  sm: { width: 40, height: 24, knob: 18, on: Green[600] },
  // "Active": 48x28, black when on - the Toggle's look.
  md: { width: 48, height: 28, knob: 22, on: Zinc[900] },
} as const;

/** The switch's track and knob alone; whatever holds it takes the press. */
export function SwitchTrack({ on, size }: { on: boolean; size: keyof typeof SIZES }) {
  const look = SIZES[size];
  const [position] = useState(() => new Animated.Value(on ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, { toValue: on ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [on, position]);

  const left = position.interpolate({ inputRange: [0, 1], outputRange: [3, look.width - look.knob - 3] });
  const backgroundColor = position.interpolate({ inputRange: [0, 1], outputRange: [Zinc[300], look.on] });

  return (
    <Animated.View style={[styles.track, { width: look.width, height: look.height, backgroundColor }]}>
      <Animated.View style={[styles.knob, { width: look.knob, height: look.knob, left }]} />
    </Animated.View>
  );
}

/** A label followed by a small green switch, the whole of it one button - the sheets' "Welcome SMS". */
export function InlineSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.inline}>
      <Txt style={styles.inlineLabel}>{label}</Txt>
      <SwitchTrack on={value} size="sm" />
    </Pressable>
  );
}

/** A bordered row - title, hint, then the switch - that toggles wherever it is tapped. */
export function SwitchRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={hint ? `${title}, ${hint}` : title}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}>
      <View style={styles.rowText}>
        <Txt style={styles.rowTitle}>{title}</Txt>
        {hint ? <Txt style={styles.rowHint}>{hint}</Txt> : null}
      </View>
      <SwitchTrack on={value} size="md" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 999, flexShrink: 0 },
  knob: {
    position: 'absolute',
    top: 3,
    borderRadius: 999,
    backgroundColor: White,
    shadowColor: '#09090B',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  inline: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineLabel: { fontSize: 13, fontWeight: '600', color: Zinc[700] },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    borderRadius: 12,
    backgroundColor: White,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  rowHint: { fontSize: 12, color: Zinc[500] },
});
