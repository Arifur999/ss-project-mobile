import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { SuggestionChips } from '@/components/SuggestionChips';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';

export type Handover = { date: string; qty: number; person: string; notes: string };

export type HandoverLabels = {
  date: string;
  howMany: string;
  person: string;
  personPlaceholder: string;
  notes: string;
  optional: string;
  save: string;
  saving: string;
  cancel: string;
  close: string;
  /** "Enter 1 to 5". */
  error: (max: string) => string;
};

/**
 * Goods changing hands in part - a purchase line arriving, a sale line going
 * out: the date, how many (all still outstanding by default, never more), who
 * took them and a note. `seedKey` opens it and starts it afresh for each line.
 */
export function HandoverSheet({
  seedKey,
  title,
  sub,
  max,
  labels: t,
  people = [],
  onSave,
  onClose,
}: {
  seedKey: string | null;
  title: string;
  sub: string;
  max: number;
  labels: HandoverLabels;
  /** Names to offer for who took them. */
  people?: string[];
  /** Throws to keep the sheet open with the error. */
  onSave: (handover: Handover) => Promise<void>;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState('');
  const [person, setPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setDate(todayISO());
      setQty(String(max));
      setPerson('');
      setNotes('');
      setSubmitted(false);
      setError(null);
    }
  }

  const count = parseAmount(qty);
  const invalid = !Number.isInteger(count) || count <= 0 || count > max;

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ date, qty: count, person: person.trim(), notes: notes.trim() });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={!!seedKey} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <View>
        <Txt accessibilityRole="header" style={styles.title}>
          {title}
        </Txt>
        <Txt style={styles.sub}>{sub}</Txt>
      </View>
      <View style={styles.pair}>
        <View style={styles.grow}>
          <DateField label={t.date} value={date} onChange={setDate} />
        </View>
        <View style={styles.grow}>
          <TextField
            tone="zinc"
            label={t.howMany}
            value={qty}
            onChangeText={setQty}
            error={submitted && invalid ? t.error(formatNumber(max, lang)) : undefined}
            plainError
            keyboardType="number-pad"
            inputStyle={styles.figure}
          />
        </View>
      </View>
      <View style={styles.group}>
        <TextField tone="zinc" label={t.person} placeholder={t.personPlaceholder} value={person} onChangeText={setPerson} />
        <SuggestionChips suggestions={people} value={person} onPick={setPerson} />
      </View>
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={notes} onChangeText={setNotes} />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={saving ? t.saving : t.save} variant="pill" onPress={save} busy={saving} style={styles.grow} />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  sub: { fontSize: 14, color: Zinc[600] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  group: { gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
