import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard } from '@/components/ChoiceCard';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { isBdPhone, isEmail, normalizePhone } from '@/lib/validation';
import { createSupplier, updateSupplier, useSupplierWrite, type SupplierInput, type SupplierRecord } from '@/services/supplier.services';

type DueType = SupplierInput['due_type'];
type Form = { company: string; person: string; phone: string; email: string; address: string; opening: string; dueType: DueType };

/**
 * Add or edit a supplier - Hatim's supplier form: company, person, phone,
 * email, address, and the opening due with which way it runs. Checked as the
 * website checks it: a company name, and a valid phone unless an old one was
 * left as it was.
 */
export function SupplierFormSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: SupplierRecord | null }) {
  const t = useCopy(SUPPLIER_COPY);
  const toast = useToast();
  const write = useSupplierWrite();
  const [form, setForm] = useState<Form>({ company: '', person: '', phone: '', email: '', address: '', opening: '', dueType: 'dena' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      const opening = Math.abs(Number(editing?.opening_due || 0));
      setForm({
        company: editing?.company_name || editing?.name || '',
        person: editing?.person_name ?? '',
        phone: editing?.phone ?? '',
        email: editing?.email ?? '',
        address: editing?.address ?? '',
        opening: opening ? String(opening) : '',
        dueType: editing?.due_type === 'pawna' ? 'pawna' : 'dena',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const opening = form.opening.trim() === '' ? 0 : parseAmount(form.opening);
  const phoneUnchanged = !!editing && form.phone.trim() === String(editing.phone || '').trim();
  const errors = {
    company: !form.company.trim() ? t.errCompany : undefined,
    phone: !form.phone.trim() || (!phoneUnchanged && !isBdPhone(form.phone)) ? t.errPhone : undefined,
    email: form.email.trim() && !isEmail(form.email) ? t.errEmail : undefined,
    opening: Number.isNaN(opening) ? t.errOpening : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const company = form.company.trim();
    const input: SupplierInput = {
      // The website writes the company into both fields.
      name: company,
      company_name: company,
      person_name: form.person.trim(),
      phone: phoneUnchanged ? form.phone.trim() : normalizePhone(form.phone),
      email: form.email.trim(),
      address: form.address.trim(),
      opening_due: opening,
      due_type: form.dueType,
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateSupplier(editing.id, input) : createSupplier(input)));
      toast.show(editing ? t.supplierUpdated(company) : t.supplierAdded(company));
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
        {editing ? t.editSupplier : t.newSupplier}
      </Txt>
      <TextField tone="zinc" label={t.companyField} value={form.company} onChangeText={(company) => set({ company })} error={shown.company} plainError />
      <TextField tone="zinc" label={t.personField} placeholder={t.optional} value={form.person} onChangeText={(person) => set({ person })} />
      <TextField
        tone="zinc"
        label={t.phoneField}
        placeholder="01XXXXXXXXX"
        value={form.phone}
        onChangeText={(phone) => set({ phone })}
        error={shown.phone}
        plainError
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <TextField
        tone="zinc"
        label={t.emailField}
        placeholder={t.optional}
        value={form.email}
        onChangeText={(email) => set({ email })}
        error={shown.email}
        plainError
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField tone="zinc" label={t.addressField} placeholder={t.optional} value={form.address} onChangeText={(address) => set({ address })} />
      <TextField
        tone="zinc"
        label={t.openingField}
        placeholder="0"
        value={form.opening}
        onChangeText={(o) => set({ opening: o })}
        error={shown.opening}
        plainError
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
      />
      <View style={styles.group}>
        <Txt style={styles.label}>{t.openingIs}</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.openingIs} style={styles.row}>
          {(['dena', 'pawna'] as const).map((type) => (
            <ChoiceCard
              key={type}
              title={t.dueTypes[type].label}
              sub={t.dueTypes[type].sub}
              dot={type === 'dena' ? Red[600] : Green[600]}
              selected={form.dueType === type}
              onPress={() => set({ dueType: type })}
            />
          ))}
        </View>
      </View>
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
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
