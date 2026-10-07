import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

export type Choice<K extends string> = { key: K; label: string; sub?: string };

/**
 * A sheet of tappable options, the design's "Select period" list: 56-tall
 * rows, the chosen one outlined in black on grey with a tick. Choosing closes
 * the sheet. Reused for the month picker and the account pickers. Given a
 * `searchPlaceholder`, a search box above the options narrows a long list
 * (the suppliers) as the user types.
 */
export function ChoiceSheet<K extends string>({
  open,
  onClose,
  title,
  options,
  selected,
  onSelect,
  closeLabel,
  searchPlaceholder,
  emptyText,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: Choice<K>[];
  selected: K | null;
  onSelect: (key: K) => void;
  closeLabel?: string;
  searchPlaceholder?: string;
  /** Shown when the search matches nothing. */
  emptyText?: string;
}) {
  const [query, setQuery] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  // Each opening starts with the whole list.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery('');
  }
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q)) : options;

  return (
    <BottomSheet open={open} onClose={onClose} gap={8} closeLabel={closeLabel}>
      <Txt accessibilityRole="header" style={styles.title}>
        {title}
      </Txt>
      {searchPlaceholder ? (
        <SearchField value={query} onChangeText={setQuery} placeholder={searchPlaceholder} label={searchPlaceholder} style={styles.search} />
      ) : null}
      {shown.length === 0 && emptyText ? <Txt style={styles.empty}>{emptyText}</Txt> : null}
      {shown.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              onSelect(option.key);
              onClose();
            }}
            style={[styles.option, isSelected ? styles.selected : styles.idle]}>
            <View style={styles.text}>
              <Txt style={styles.label}>{option.label}</Txt>
              {option.sub ? <Txt style={styles.sub}>{option.sub}</Txt> : null}
            </View>
            {isSelected ? <Check size={20} color={Zinc[900]} strokeWidth={2.4} /> : null}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 6, marginBottom: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 14 },
  selected: { borderWidth: 1.5, borderColor: Zinc[900], backgroundColor: Zinc[100] },
  idle: { borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  text: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[500] },
  search: { marginBottom: 4 },
  empty: { paddingVertical: 16, textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
