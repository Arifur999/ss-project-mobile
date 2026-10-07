import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ContactCard } from '@/components/ContactCard';
import { ActionsSheet, ConfirmDeleteSheet, type ExtraAction } from '@/components/ItemSheets';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { PROGRESS_LOOK } from '@/constants/progress';
import { Red, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { EmployeeFormSheet } from '@/features/employees/EmployeeFormSheet';
import { EmployeesShell } from '@/features/employees/EmployeesShell';
import { ResignSheet } from '@/features/employees/ResignSheet';
import { useCan } from '@/hooks/useCan';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { matches } from '@/lib/search';
import { deleteEmployee, useEmployeeData, useEmployeeWrite, type Employee } from '@/services/employees.services';

/** Every employee - Hatim's Employee List: contact, join and resign dates, add, edit, resign, delete. */
export default function EmployeeListScreen() {
  const t = useCopy(EMPLOYEE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const can = useCan();
  const write = useEmployeeWrite();
  const { data } = useEmployeeData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'form' | 'resign' | 'delete' | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const employees = (data?.employees ?? []).filter((e) => matches(search, e.name, e.phone, e.address));
  const mayWrite = can('employee.write');

  const openForm = (employee: Employee | null) => {
    setEditing(employee);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteEmployee(selected.id));
      toast.show(t.employeeDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  const extra: ExtraAction[] = selected?.is_active && mayWrite ? [{ label: t.resign, icon: 'logout', onPress: () => setSheet('resign') }] : [];

  return (
    <EmployeesShell section="list" fab={mayWrite ? { label: t.newEmployee, onPress: () => openForm(null) } : null}>
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchEmployees} label={t.searchLabel} />
      <Txt style={styles.count}>{t.countEmployees(employees.length, formatNumber(employees.length, lang))}</Txt>

      {employees.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{search.trim() ? t.noMatch : t.noEmployees}</Txt>
        </View>
      ) : (
        employees.map((e) => {
          const resigned = !e.is_active;
          return (
            <ContactCard
              key={e.id}
              name={e.name}
              lines={[e.address, e.notes]}
              phone={e.phone}
              callLabel={t.call(e.name, String(e.phone || '').trim())}
              onMore={() => {
                setSelected(e);
                setSheet('actions');
              }}
              footer={{
                label: resigned && e.resign_date ? t.resignedOn(dateLabel(String(e.resign_date), lang)) : t.joined(dateLabel(String(e.join_date || ''), lang)),
                value: '',
                color: Zinc[900],
                chip: resigned ? { label: t.resignedBadge, bg: Red[50], ink: Red[700] } : { label: t.activeBadge, ...PROGRESS_LOOK.all },
              }}
            />
          );
        })
      )}

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected?.name ?? ''}
        subtitle={[selected?.phone, selected?.address].filter(Boolean).join(' · ')}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.editEmployee}
        deleteLabel={t.deleteEmployee}
        onEdit={mayWrite ? () => openForm(selected) : undefined}
        onDelete={can('employee.delete') ? () => setSheet('delete') : undefined}
        extra={extra}
      />
      <EmployeeFormSheet open={sheet === 'form'} onClose={() => setSheet(null)} editing={editing} />
      <ResignSheet employee={sheet === 'resign' ? selected : null} onClose={() => setSheet(null)} />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteEmployeeTitle(selected.name) : ''}
        text={t.deleteEmployeeText}
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
  count: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
