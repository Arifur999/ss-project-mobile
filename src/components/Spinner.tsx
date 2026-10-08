import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The design's busy indicator: a three-quarter arc turning once every 0.8s
 * over a faint full ring, so it reads as turning in place.
 */
export function Spinner({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View accessibilityRole="progressbar" style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={color} strokeOpacity={0.18} strokeWidth={2.4} />
        <Path d="M21 12a9 9 0 1 1-6.219-8.56" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
