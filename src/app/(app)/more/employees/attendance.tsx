import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FiguresCard } from '@/components/FiguresCard';
import { FilterChips } from '@/components/FilterChips';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { PROGRESS_LOOK } from '@/constants/progress';
import { Red, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { AttendanceSheet } from '@/features/employees/AttendanceSheet';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { EmployeesShell } from '@/features/employees/EmployeesShell';
import { useCan } from '@/hooks/useCan';
import { attendanceDisplay, hoursAndMinutes } from '@/lib/attendance';
import { dateLabel, timeLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { deleteAttendance, useEmployeeData, useEmployeeWrite } from '@/services/employees.services';

type Row = Record<string, any>;

const ALL = '__all';
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;
const ABSENT_LOOK = { bg: Red[50], ink: Red[700] };

/** Every day recorded - Hatim's Employee Attendance: by employee and period, present and absent, record, edit, delete. */
export default function AttendanceScreen() {
  const t = useCopy(EMPLOYEE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const can = useCan();
  const write = useEmployeeWrite();
  const { data } = useEmployeeData();
  const [employee, setEmployee] = useState(ALL);
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'form' | 'actions' | 'delete' | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const num = (n: unknown) => formatNumber(n, lang);
  const range = listRange(period);
  const rows = (data?.attendance ?? []).filter((a) => (employee === ALL || a.employee_id === employee) && inRange(a.date, range));
  const present = rows.filter((a) => a.present).length;
  const nameOf = (a: Row) => data?.employees.find((e) => e.id === a.employee_id)?.name ?? '';
  const mayOpen = can('attendance.write') || can('attendance.delete');

  const openForm = (row: Row | null) => {
    setEditing(row);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteAttendance(String(selected.id)));
      toast.show(t.attendanceDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <EmployeesShell section="attendance" fab={can('attendance.write') ? { label: t.newAttendance, onPress: () => openForm(null) } : null}>
      <FigureCard dark label={t.attendanceTitle} value={num(present)} caption={t.attendanceCounts(num(rows.length), num(present), num(rows.length - present))} />
      <SelectPill
        shape="pill"
        label={t.filterEmployee}
        value={employee}
        active={employee !== ALL}
        onChange={(e) => {
          setEmployee(e);
          setLimit(PAGE);
        }}
        closeLabel={t.close}
        options={[{ key: ALL, label: t.allEmployees }, ...(data?.employees ?? []).map((e) => ({ key: e.id, label: e.name }))]}
      />
      <FilterChips
        label={t.periodLabel}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          setLimit(PAGE);
        }}
        options={LIST_PERIODS.map((key) => ({ key, label: t.periods[key] }))}
      />

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noAttendance}</Txt>
        </View>
      ) : (
        rows.slice(0, limit).map((a) => {
          const shown = attendanceDisplay(a);
          const split = hoursAndMinutes(shown.hours);
          return (
            <FiguresCard
              key={String(a.id)}
              title={nameOf(a)}
              meta={dateLabel(String(a.date || ''), lang)}
              sub={shown.notes || undefined}
              badge={a.present ? { label: t.present, ...PROGRESS_LOOK.all } : { label: t.absent, ...ABSENT_LOOK }}
              figures={[
                { label: t.startTime, value: timeLabel(shown.start_time, lang) || '-' },
                { label: t.endTime, value: timeLabel(shown.end_time, lang) || '-' },
                {
                  label: t.hoursTotal,
                  value: shown.legacyLabel || (shown.hours > 0 ? t.hoursLabel(num(split.hours), num(split.minutes)) : '-'),
                  strong: true,
                },
              ]}
              onPress={
                mayOpen
                  ? () => {
                      setSelected(a);
                      setSheet('actions');
                    }
                  : undefined
              }
            />
          );
        })
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <AttendanceSheet open={sheet === 'form'} editing={editing} onClose={() => setSheet(null)} />
      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? nameOf(selected) : ''}
        subtitle={selected ? `${dateLabel(String(selected.date || ''), lang)} · ${selected.present ? t.present : t.absent}` : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.editAttendance}
        deleteLabel={t.deleteAttendance}
        onEdit={can('attendance.write') ? () => openForm(selected) : undefined}
        onDelete={can('attendance.delete') ? () => setSheet('delete') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={t.deleteAttendanceTitle}
        text={t.deleteAttendanceText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </EmployeesShell>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
