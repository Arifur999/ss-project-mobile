import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard, PICKED_IN, PICKED_OUT } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { TimeField } from '@/components/TimeField';
import { Txt } from '@/components/Txt';
import { Amber, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { attendanceDisplay, hoursAndMinutes, shiftHours } from '@/lib/attendance';
import { dateLabel, todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { saveAttendance, useEmployeeData, useEmployeeWrite } from '@/services/employees.services';

type Row = Record<string, any>;
type Form = { employee_id: string; date: string; present: boolean; start: string; end: string; notes: string };

/**
 * Recording a day's attendance - the website's attendance form: who and which
 * day, present or absent, the shift's start and end with its hours, and a
 * note. The server keeps one row per employee a day, so an edit (and a second
 * entry for the same day) updates that row.
 */
export function AttendanceSheet({ open, editing, onClose }: { open: boolean; editing: Row | null; onClose: () => void }) {
  const t = useCopy(EMPLOYEE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useEmployeeWrite();
  const { data } = useEmployeeData();
  const [form, setForm] = useState<Form>({ employee_id: '', date: todayISO(), present: true, start: '', end: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? String(editing?.id ?? 'new') : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      const shown = editing ? attendanceDisplay(editing) : null;
      setForm({
        employee_id: String(editing?.employee_id ?? ''),
        date: editing ? String(editing.date || '').slice(0, 10) : todayISO(),
        present: editing ? editing.present !== false : true,
        start: shown?.start_time ?? '',
        end: shown?.end_time ?? '',
        notes: shown?.notes ?? '',
      });
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const hours = form.present ? shiftHours(form.start, form.end) : 0;
  const split = hoursAndMinutes(hours);
  const already =
    !editing && (data?.attendance ?? []).some((a) => a.employee_id === form.employee_id && String(a.date || '').slice(0, 10) === form.date);
  const invalid = !form.employee_id;

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      await write(() =>
        saveAttendance({
          employee_id: form.employee_id,
          date: form.date,
          present: form.present,
          start_time: form.present && form.start ? form.start : null,
          end_time: form.present && form.end ? form.end : null,
          total_hours: String(hours),
          notes: form.notes.trim(),
        }),
      );
      toast.show(t.attendanceSaved);
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
        {editing ? t.editAttendance : t.newAttendance}
      </Txt>
      {editing ? (
        // The day and who are fixed: moving a record is a delete and a new one.
        <Txt style={styles.fixed}>{[data?.employees.find((e) => e.id === form.employee_id)?.name, dateLabel(form.date, lang)].filter(Boolean).join(' · ')}</Txt>
      ) : (
        <SelectField
          label={t.employeeField}
          placeholder={t.chooseEmployee}
          closeLabel={t.close}
          value={form.employee_id}
          options={(data?.employees ?? []).filter((e) => e.is_active).map((e) => ({ key: e.id, label: [e.name, e.phone].filter(Boolean).join(' - ') }))}
          onChange={(employee_id) => set({ employee_id })}
          error={submitted && invalid ? t.errEmployee : undefined}
          searchPlaceholder={t.searchPick}
          emptyText={t.noMatch}
        />
      )}
      {editing ? null : <DateField label={t.date} value={form.date} onChange={(date) => set({ date })} />}
      {already ? <Txt style={styles.warn}>{t.existingDay}</Txt> : null}
      <View style={styles.group}>
        <Txt style={styles.label}>{t.status}</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.status} style={styles.row}>
          <ChoiceCard title={t.present} sub={t.presentSub} selected={form.present} picked={PICKED_IN} onPress={() => set({ present: true })} />
          <ChoiceCard title={t.absent} sub={t.absentSub} selected={!form.present} picked={PICKED_OUT} onPress={() => set({ present: false })} />
        </View>
      </View>
      {form.present ? (
        <>
          <View style={styles.row}>
            <View style={styles.grow}>
              <TimeField label={t.startTime} value={form.start} onChange={(start) => set({ start })} placeholder={t.noTime} clearLabel={t.clear} />
            </View>
            <View style={styles.grow}>
              <TimeField label={t.endTime} value={form.end} onChange={(end) => set({ end })} placeholder={t.noTime} clearLabel={t.clear} />
            </View>
          </View>
          {hours > 0 ? <Txt style={styles.hours}>{`${t.hoursTotal}: ${t.hoursLabel(formatNumber(split.hours, lang), formatNumber(split.minutes, lang))}`}</Txt> : null}
        </>
      ) : null}
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
  fixed: { fontSize: 15, fontWeight: '600', color: Zinc[700] },
  group: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  hours: { fontSize: 14, fontWeight: '600', color: Zinc[700] },
  warn: { fontSize: 13, color: Amber[800] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
