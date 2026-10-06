import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { isBdPhone, normalizePhone } from '@/lib/validation';
import { createShareholder, updateShareholder, useShareholderWrite, type Shareholder } from '@/services/shareholders.services';

type Form = { name: string; phone: string; address: string; opening: string };

/** Add or edit a shareholder: name, phone, address and the capital they started with. */
export function ShareholderFormSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Shareholder | null }) {
  const t = useCopy(SHAREHOLDER_COPY);
  const toast = useToast();
  const write = useShareholderWrite();
  const [form, setForm] = useState<Form>({ name: '', phone: '', address: '', opening: '0' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm({
        name: editing?.name ?? '',
        phone: editing?.phone ?? '',
        address: editing?.address ?? '',
        opening: String(Number(editing?.opening_amount ?? 0)),
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const opening = form.opening.trim() === '' ? 0 : parseAmount(form.opening, { allowNegative: true });
  const errors: Partial<Record<'name' | 'phone' | 'opening', string>> = {};
  if (!form.name.trim()) errors.name = t.errName;
  if (!isBdPhone(form.phone)) errors.phone = t.errPhone;
  if (Number.isNaN(opening)) errors.opening = t.errOpening;
  const shown = submitted ? errors : {};
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const input = { name: form.name.trim(), phone: normalizePhone(form.phone), address: form.address.trim(), opening_amount: opening };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateShareholder(editing.id, input) : createShareholder(input)));
      toast.show(editing ? t.shareholderUpdated : t.shareholderAdded);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {editing ? t.editShareholder : t.newShareholder}
      </Txt>
      <TextField tone="zinc" label={t.name} value={form.name} onChangeText={(name) => set({ name })} error={shown.name} plainError />
      <TextField
        tone="zinc"
        label={t.phone}
        placeholder="01XXXXXXXXX"
        value={form.phone}
        onChangeText={(phone) => set({ phone })}
        error={shown.phone}
        plainError
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <TextField tone="zinc" label={t.address} placeholder={t.optional} value={form.address} onChangeText={(address) => set({ address })} />
      <TextField
        tone="zinc"
        label={t.openingAmountField}
        value={form.opening}
        onChangeText={(o) => set({ opening: o })}
        error={shown.opening}
        plainError
        hint={t.openingHint}
        keyboardType="numbers-and-punctuation"
      />
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
