import { Check, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Green, Red } from '@/constants/theme';

/**
 * The boxed message above or below a form:
 *   error   - pale red, warning triangle ("Fix the 3 highlighted fields",
 *             "Wrong email or password")
 *   success - pale green, check ("A reset code has been sent")
 */
export function AlertBanner({ tone, children }: { tone: 'error' | 'success'; children?: string | null }) {
  if (!children) return null;
  const error = tone === 'error';
  const ink = error ? Red[700] : Green[700];
  return (
    <View
      accessibilityRole={error ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.box, error ? styles.error : styles.success]}>
      {error ? (
        <TriangleAlert size={18} color={ink} strokeWidth={2} style={styles.icon} />
      ) : (
        <Check size={18} color={ink} strokeWidth={2.4} style={styles.icon} />
      )}
      <Txt style={[styles.text, { color: ink }]}>{children}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  error: { backgroundColor: Red[50], borderColor: Red[200] },
  success: { backgroundColor: Green[50], borderColor: Green[200] },
  icon: { marginTop: 2 },
  text: { flexShrink: 1, fontSize: 14, fontWeight: '500' },
});
