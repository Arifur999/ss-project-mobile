import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { ProductImage } from '@/components/ProductImage';
import { Txt } from '@/components/Txt';
import { Red, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { PRODUCT_COPY } from '@/features/products/copy';

/**
 * The product photo: a preview of what will be saved - the photo just picked,
 * else the one on file - with Add / Change and Remove. Nothing is uploaded
 * here; the form uploads on save, so backing out costs nothing.
 */
export function PhotoField({
  uri,
  onPick,
  onRemove,
  error,
  disabled,
}: {
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const t = useCopy(PRODUCT_COPY);
  return (
    <View style={styles.wrap}>
      <Txt style={styles.label}>{t.photo}</Txt>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={uri ? t.changePhoto : t.addPhoto} onPress={onPick} disabled={disabled}>
          <ProductImage url={uri} size={96} radius={16} />
        </Pressable>
        <View style={styles.side}>
          <Button title={uri ? t.changePhoto : t.addPhoto} icon="upload" variant="pillOutline" onPress={onPick} disabled={disabled} style={styles.button} />
          {uri ? (
            <Pressable accessibilityRole="button" onPress={onRemove} disabled={disabled} style={styles.remove}>
              <Txt style={styles.removeText}>{t.removePhoto}</Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? <FieldError plain>{error}</FieldError> : <Txt style={styles.hint}>{t.photoHint}</Txt>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  side: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 4 },
  button: { height: 44 },
  remove: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  removeText: { fontSize: 14, fontWeight: '600', color: Red[700] },
  hint: { fontSize: 13, color: Zinc[500] },
});
