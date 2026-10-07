import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, westernDigits } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { isValidBdPhone } from '@/lib/phone';
import { createEmployee, updateEmployee, useEmployeeWrite, type Employee } from '@/services/employees.services';

type Form = { name: string; phone: string; address: string; join_date: string; notes: string };

/**
 * Adding or editing an employee - the website's Join form: name, phone,
 * address, join date and a note, all but the note required. A new employee's
 * phone must be a valid number; an old record keeps whatever it has.
 */
export function EmployeeFormSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Employee | null }) {
  const t = useCopy(EMPLOYEE_COPY);
  const toast = useToast();
  const write = useEmployeeWrite();
  const [form, setForm] = useState<Form>({ name: '', phone: '', address: '', join_date: todayISO(), notes: '' });
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
        join_date: String(editing?.join_date || todayISO()).slice(0, 10),
        notes: editing?.notes ?? '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const phone = form.phone.trim();
  const errors = {
    name: !form.name.trim() ? t.errName : undefined,
    // As the website: the format is checked on a new join only, so a legacy record still saves.
    phone: !phone ? t.errPhoneRequired : !editing && !isValidBdPhone(phone) ? t.errPhone : undefined,
    address: !form.address.trim() ? t.errAddress : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const input = {
      name: form.name.trim(),
      phone: editing ? phone : westernDigits(phone),
      address: form.address.trim(),
      join_date: form.join_date,
      resign_date: null,
      notes: form.notes.trim() || null,
      is_active: true as const,
    };
    setSaving(true);
    setError(null);
    try {
      await write(() => (editing ? updateEmployee(editing.id, input) : createEmployee(input)));
      toast.show(editing ? t.employeeUpdated : t.employeeSaved);
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
        {editing ? t.editEmployee : t.newEmployee}
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
      <TextField tone="zinc" label={t.address} value={form.address} onChangeText={(address) => set({ address })} error={shown.address} plainError />
      <DateField label={t.joinDate} value={form.join_date} onChange={(join_date) => set({ join_date })} />
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} />
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
  grow: { flex: 1, minWidth: 0 },
});
