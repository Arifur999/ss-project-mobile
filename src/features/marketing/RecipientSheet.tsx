import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { MARKETING_COPY } from '@/features/marketing/copy';
import { CONTACT_TYPES, filterContacts, type Contact, type ContactType } from '@/lib/marketingContacts';

// Drawn a slice at a time: a shop's customer list can run to thousands.
const PAGE = 60;

/**
 * Choosing who an SMS goes to - the website's recipient panel: the kinds of
 * contact to show, a search, every one shown chosen or cleared at once, and
 * each picked or dropped by a tap. A contact without a phone shows it.
 */
export function RecipientSheet({
  open,
  contacts,
  selected,
  onChange,
  onClose,
}: {
  open: boolean;
  contacts: Contact[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const t = useCopy(MARKETING_COPY);
  const [types, setTypes] = useState<ContactType[]>(CONTACT_TYPES);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const shown = filterContacts(contacts, types, search);
  const chosen = new Set(selected);
  const allShownChosen = shown.length > 0 && shown.every((c) => chosen.has(c.id));

  const toggleType = (type: ContactType) => {
    setTypes((current) => (current.includes(type) ? current.filter((x) => x !== type) : [...current, type]));
    setLimit(PAGE);
  };
  const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const toggleShown = () => {
    const ids = new Set(shown.map((c) => c.id));
    onChange(allShownChosen ? selected.filter((id) => !ids.has(id)) : [...new Set([...selected, ...ids])]);
  };

  return (
    <BottomSheet open={open} onClose={onClose} gap={10} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.pickTitle}
      </Txt>
      <View style={styles.chips}>
        {CONTACT_TYPES.map((type) => {
          const on = types.includes(type);
          return (
            <Pressable
              key={type}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleType(type)}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
              <Txt style={[styles.chipText, on ? styles.chipTextOn : styles.chipTextOff]}>{t.types[type]}</Txt>
            </Pressable>
          );
        })}
      </View>
      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          setLimit(PAGE);
        }}
        placeholder={t.search}
        label={t.search}
      />
      {shown.length > 0 ? <Button title={allShownChosen ? t.clearShown : t.selectShown} variant="pillOutline" onPress={toggleShown} /> : null}

      {shown.length === 0 ? (
        <Txt style={styles.empty}>{t.noContacts}</Txt>
      ) : (
        shown.slice(0, limit).map((contact) => {
          const on = chosen.has(contact.id);
          return (
            <Pressable
              key={contact.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${contact.name}, ${contact.phone || t.noPhone}`}
              onPress={() => toggle(contact.id)}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <DesignIcon name="check" size={14} color={White} strokeWidth={3} /> : null}</View>
              <View style={styles.body}>
                <Txt style={styles.name} numberOfLines={1}>
                  {contact.name}
                </Txt>
                <Txt style={[styles.meta, !contact.phone && styles.noPhone]} numberOfLines={1}>
                  {[contact.phone || t.noPhone, t.types[contact.type], contact.subtitle].filter(Boolean).join(' · ')}
                </Txt>
              </View>
            </Pressable>
          );
        })
      )}
      {shown.length > limit ? <Button title={`+ ${shown.length - limit}`} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
      <Button title={t.done} variant="pill" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 6, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  chipOn: { backgroundColor: Zinc[900] },
  chipOff: { backgroundColor: Zinc[100] },
  chipText: { fontSize: 13 },
  chipTextOn: { fontWeight: '600', color: White },
  chipTextOff: { fontWeight: '500', color: Zinc[700] },
  empty: { paddingVertical: 20, textAlign: 'center', fontSize: 14, color: Zinc[600] },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    backgroundColor: White,
  },
  rowOn: { borderColor: Zinc[900] },
  pressed: { backgroundColor: Zinc[50] },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Zinc[400], alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Zinc[900], borderColor: Zinc[900] },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
  noPhone: { color: Zinc[400] },
});
