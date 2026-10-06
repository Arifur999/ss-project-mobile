import { StyleSheet, View } from 'react-native';

/**
 * A rounded bar filled to `percent` (0-100): the budget meters (8 tall) and
 * the category shares (6 tall, never thinner than 3px so a sliver still shows).
 */
export function ProgressBar({
  percent,
  color,
  track,
  height = 8,
  minWidth = 0,
  label,
}: {
  percent: number;
  color: string;
  track: string;
  height?: number;
  minWidth?: number;
  /** For screen readers; leave out where the figure is spelled out beside it. */
  label?: string;
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityValue={label ? { min: 0, max: 100, now: Math.round(percent) } : undefined}
      style={[styles.track, { height, backgroundColor: track }]}>
      <View style={[styles.fill, { width: `${width}%`, minWidth: width > 0 ? minWidth : 0, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
