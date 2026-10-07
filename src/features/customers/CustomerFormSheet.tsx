import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, westernDigits } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { isValidBdPhone, phoneBelongsToAnotherCustomer } from '@/lib/phone';
import { isEmail } from '@/lib/validation';
import { createCustomer, updateCustomer, useCustomerData, useCustomerWrite, type Customer, type CustomerInput } from '@/services/customers.services';

type Form = { name: string; phone: string; email: string; address: string; opening: string };

/**
 * Add or edit a customer - Hatim's customer form: name, phone, email,
 * address and the opening due. Checked as the website checks it: a name, a
 * valid 11-digit number unless an old one was left as it was, and a number no
 * other customer already has.
 */
export function CustomerFormSheet({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Customer | null;
  /** Hands back the saved customer - the sale form picks the one it just added. */
  onSaved?: (customer: Customer) => void;
}) {
  const t = useCopy(CUSTOMER_COPY);
  const toast = useToast();
  const write = useCustomerWrite();
  const { data } = useCustomerData();
  const [form, setForm] = useState<Form>({ name: '', phone: '', email: '', address: '', opening: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      const opening = Number(editing?.opening_due || 0);
      setForm({
        name: editing?.name ?? '',
        phone: editing?.phone ?? '',
        email: editing?.email ?? '',
        address: editing?.address ?? '',
        opening: opening ? String(opening) : '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const phone = form.phone.trim();
  const opening = form.opening.trim() === '' ? 0 : parseAmount(form.opening);
  const phoneUnchanged = !!editing && phone === String(editing.phone || '').trim();
  const errors = {
    name: !form.name.trim() ? t.errName : undefined,
    phone: !phone
      ? t.errPhoneRequired
      : !phoneUnchanged && !isValidBdPhone(phone)
        ? t.errPhone
        : phoneBelongsToAnotherCustomer(phone, data?.customers ?? [], editing?.id)
          ? t.errPhoneTaken
          : undefined,
    email: form.email.trim() && !isEmail(form.email) ? t.errEmail : undefined,
    opening: Number.isNaN(opening) ? t.errOpening : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const input: CustomerInput = {
      name: form.name.trim(),
      // A Bangla keyboard's digits are stored as the website types them.
      phone: phoneUnchanged ? phone : westernDigits(phone),
      email: form.email.trim(),
      address: form.address.trim(),
      opening_due: opening,
    };
    setSaving(true);
    setError(null);
    try {
      const saved = await write(() => (editing ? updateCustomer(editing.id, input) : createCustomer(input)));
      toast.show(editing ? t.customerUpdated : t.customerSaved);
      onSaved?.(saved);
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
        {editing ? t.editCustomer : t.newCustomer}
      </Txt>
      <TextField tone="zinc" label={t.name} value={form.name} onChangeText={(name) => set({ name })} error={shown.name} plainError />
      <TextField
        tone="zinc"
        label={t.phone}
        placeholder="01XXXXXXXXX"
        value={form.phone}
        onChangeText={(p) => set({ phone: p })}
        error={shown.phone}
        plainError
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <TextField
        tone="zinc"
        label={t.email}
        placeholder={t.optional}
        value={form.email}
        onChangeText={(email) => set({ email })}
        error={shown.email}
        plainError
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField tone="zinc" label={t.address} placeholder={t.optional} value={form.address} onChangeText={(address) => set({ address })} />
      <TextField
        tone="zinc"
        label={t.openingField}
        placeholder="0"
        value={form.opening}
        onChangeText={(o) => set({ opening: o })}
        error={shown.opening}
        plainError
        hint={t.openingHint}
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
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
  figure: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1, minWidth: 0 },
});
