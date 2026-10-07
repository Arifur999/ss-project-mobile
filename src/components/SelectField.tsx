import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { FieldError } from '@/components/FieldError';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';

/**
 * The design's <select>: a 50-tall zinc field with a chevron, its options in a
 * sheet when tapped (a native dropdown cannot take the design's styling).
 */
export function SelectField<K extends string>({
  label,
  placeholder,
  value,
  options,
  onChange,
  error,
  sheetTitle,
  closeLabel,
  searchPlaceholder,
  emptyText,
}: {
  label?: string;
  placeholder: string;
  value: K | '';
  options: { key: K; label: string }[];
  onChange: (key: K) => void;
  error?: string | null;
  sheetTitle?: string;
  closeLabel?: string;
  /** Turns on the sheet's search box, for a long list. */
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);
  return (
    <View style={styles.wrap}>
      {label ? <Txt style={styles.label}>{label}</Txt> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${current?.label ?? placeholder}` : current?.label ?? placeholder}
        onPress={() => setOpen(true)}
        style={[styles.field, error ? styles.fieldError : styles.fieldIdle]}>
        <Txt style={[styles.value, !current && styles.placeholder]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Txt>
        <DesignIcon name="chevronDown" size={18} color={Zinc[600]} strokeWidth={2} />
      </Pressable>
      {error?.trim() ? <FieldError plain>{error}</FieldError> : null}
      <ChoiceSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label ?? placeholder}
        closeLabel={closeLabel}
        options={options}
        selected={value || null}
        onSelect={onChange}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  field: {
    height: 50,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldIdle: { borderWidth: 1, borderColor: Zinc[300], backgroundColor: White },
  fieldError: { borderWidth: 1.5, borderColor: Red[600], backgroundColor: Red[50] },
  value: { flex: 1, fontSize: 16, color: Zinc[900] },
  placeholder: { color: Zinc[900] },
});
