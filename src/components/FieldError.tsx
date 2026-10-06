import { CircleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Red } from '@/constants/theme';

/**
 * The red line under a field that failed validation. The auth screens draw it
 * with a circle-alert icon; the in-app sheets draw plain text (`plain`).
 */
export function FieldError({
  children,
  plain = false,
  center = false,
}: {
  children?: string | null;
  plain?: boolean;
  center?: boolean;
}) {
  if (!children) return null;
  if (plain) {
    return (
      <Txt accessibilityRole="alert" style={styles.text}>
        {children}
      </Txt>
    );
  }
  return (
    <View accessibilityRole="alert" style={[styles.row, center && styles.center]}>
      <CircleAlert size={16} color={Red[700]} strokeWidth={2} style={styles.icon} />
      <Txt style={[styles.text, styles.flex, center && styles.centerText]}>{children}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  center: { justifyContent: 'center' },
  icon: { marginTop: 3 },
  text: { fontSize: 14, color: Red[700] },
  flex: { flexShrink: 1 },
  centerText: { textAlign: 'center' },
});
