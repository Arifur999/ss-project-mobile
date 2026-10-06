import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { White, Zinc } from '@/constants/theme';

/**
 * The design's on/off switch: a 48x28 track (black on, grey off) with a white
 * 22px knob, inside a 56x44 touch target. Drawn rather than the platform
 * Switch so it looks the same on Android and iOS.
 */
export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, position]);

  const left = position.interpolate({ inputRange: [0, 1], outputRange: [3, 23] });
  const backgroundColor = position.interpolate({ inputRange: [0, 1], outputRange: [Zinc[300], Zinc[900]] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.hit}>
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View style={[styles.knob, { left }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { width: 56, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  track: { width: 48, height: 28, borderRadius: 999 },
  knob: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: White,
    shadowColor: '#09090B',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
