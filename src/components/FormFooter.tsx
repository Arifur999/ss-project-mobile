import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { White, Zinc } from '@/constants/theme';

/**
 * The bar under a full-screen form: Cancel, then the wide primary Save -
 * outside the scroll, so Save is always in reach, and lifted with the
 * keyboard by the screen's KeyboardAvoidingView.
 */
export function FormFooter({
  cancelLabel,
  onCancel,
  saveLabel,
  onSave,
  saving,
}: {
  cancelLabel: string;
  onCancel: () => void;
  saveLabel: string;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <View style={styles.footer}>
      <Button title={cancelLabel} variant="pillOutline" onPress={onCancel} disabled={saving} />
      <Button title={saveLabel} variant="pill" onPress={onSave} busy={saving} style={styles.grow} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Zinc[200],
    backgroundColor: White,
  },
  grow: { flex: 1 },
});
