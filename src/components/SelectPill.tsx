import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/**
 * The design's compact 44-tall <select>s, opening a sheet of options:
 *   box  - the loan overview's sort picker, a 12-radius field
 *   pill - the transaction filters, outlined in black once something is chosen
 */
export function SelectPill<K extends string>({
  label,
  value,
  options,
  onChange,
  shape,
  active,
  closeLabel,
  style,
}: {
  /** What the picker chooses; the sheet's title and the screen reader's label. */
  label: string;
  value: K;
  options: { key: K; label: string }[];
  onChange: (key: K) => void;
  shape: 'box' | 'pill';
  /** Pill only: a filter is applied. */
  active?: boolean;
  closeLabel?: string;
  style?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);
  const pill = shape === 'pill';
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ''}`}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          pill ? styles.pill : styles.box,
          pill && (active ? styles.pillOn : styles.pillOff),
        ]}>
        <Txt style={[styles.text, pill && styles.textPill]} numberOfLines={1}>
          {current?.label ?? ''}
        </Txt>
      </Pressable>
      <View pointerEvents="none" style={[styles.chevron, { right: pill ? 12 : 10 }]}>
        <DesignIcon name="chevronDown" size={16} color={Zinc[600]} strokeWidth={2} />
      </View>
      <ChoiceSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        closeLabel={closeLabel}
        options={options}
        selected={value}
        onSelect={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: 44, justifyContent: 'center', backgroundColor: White },
  box: { paddingLeft: 12, paddingRight: 30, borderRadius: 12, borderWidth: 1, borderColor: Zinc[300] },
  pill: { paddingLeft: 14, paddingRight: 34, borderRadius: 999 },
  pillOn: { borderWidth: 1.5, borderColor: Zinc[900], backgroundColor: Zinc[100] },
  pillOff: { borderWidth: 1, borderColor: Zinc[200] },
  text: { fontSize: 14, color: Zinc[900] },
  textPill: { fontWeight: '600' },
  chevron: { position: 'absolute', top: 14 },
});
