import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { updateEmployee, useEmployeeWrite, type Employee } from '@/services/employees.services';

/**
 * An employee leaving - the website's Resign form: the date and a note. They
 * stay on the books, marked resigned, with their payments and attendance.
 */
export function ResignSheet({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const t = useCopy(EMPLOYEE_COPY);
  const toast = useToast();
  const write = useEmployeeWrite();
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = employee?.id ?? null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (employee) {
      setDate(todayISO());
      setNotes(employee.notes ?? '');
      setSubmitted(false);
      setError(null);
    }
  }

  const joined = String(employee?.join_date || '').slice(0, 10);
  const invalid = !!joined && date < joined;

  const save = async () => {
    if (saving || !employee) return;
    setSubmitted(true);
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      await write(() => updateEmployee(employee.id, { resign_date: date, notes: notes.trim() || null, is_active: false }));
      toast.show(t.resignedSaved);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={!!employee} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.resignTitle(employee?.name ?? '')}
      </Txt>
      <DateField label={t.resignDate} value={date} onChange={setDate} />
      {submitted && invalid ? <FieldError plain>{t.errResign}</FieldError> : null}
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1, minWidth: 0 },
});
