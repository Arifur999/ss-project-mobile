import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { MoneyLine } from '@/components/MoneyLine';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { EmployeesShell } from '@/features/employees/EmployeesShell';
import { PaySalarySheet } from '@/features/employees/PaySalarySheet';
import { useCan } from '@/hooks/useCan';
import { dateLabel } from '@/lib/dates';
import { payAmount, payKind, periodDays } from '@/lib/employees';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { inRange, LIST_PERIODS, listRange, type ListPeriod } from '@/lib/periods';
import { deleteSalaryPayment, useEmployeeData, useEmployeeWrite } from '@/services/employees.services';

type Row = Record<string, any>;

const ALL = '__all';
// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** Every salary and bonus paid - Hatim's Employee Transactions: by employee and period, pay, delete. */
export default function SalaryPaymentsScreen() {
  const t = useCopy(EMPLOYEE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useEmployeeWrite();
  const { data } = useEmployeeData();
  const [employee, setEmployee] = useState(ALL);
  const [period, setPeriod] = useState<ListPeriod>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'pay' | 'actions' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const num = (n: unknown) => formatNumber(n, lang);
  const range = listRange(period);
  const rows = (data?.payments ?? []).filter((p) => (employee === ALL || p.employee_id === employee) && inRange(p.date, range));
  // Over every payment the filters keep, not the slice drawn.
  const salary = rows.reduce((s, p) => s + Number(p.amount || 0), 0);
  const bonus = rows.reduce((s, p) => s + Number(p.bonus || 0), 0);
  const nameOf = (p: Row) => data?.employees.find((e) => e.id === p.employee_id)?.name || String(p.employee_name || '');

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteSalaryPayment(selected));
      toast.show(t.paymentDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <EmployeesShell section="payments" fab={can('salary.create') ? { label: t.newPayment, onPress: () => setSheet('pay') } : null}>
      <FigureCard dark label={t.payShown} value={money(salary + bonus)} caption={t.countPayments(rows.length, num(rows.length))} />
      <View style={styles.row}>
        <FigureCard label={t.salary} value={money(salary)} />
        <FigureCard label={t.bonus} value={money(bonus)} />
      </View>
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
          <Txt style={styles.emptyText}>{t.noPayments}</Txt>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.slice(0, limit).map((p, i) => {
            const days = periodDays(p);
            return (
              <MoneyLine
                key={String(p.id)}
                direction="out"
                title={nameOf(p)}
                meta={[dateLabel(String(p.date || ''), lang), t.kinds[payKind(p)], p.account_name, days !== null ? t.periodDays(num(days)) : '']
                  .filter(Boolean)
                  .join(' · ')}
                note={p.notes}
                amount={money(payAmount(p))}
                first={i === 0}
                label={`${nameOf(p)}, ${money(payAmount(p))}`}
                onPress={
                  can('salary.delete')
                    ? () => {
                        setSelected(p);
                        setSheet('actions');
                      }
                    : undefined
                }
              />
            );
          })}
        </View>
      )}
      {rows.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <PaySalarySheet open={sheet === 'pay'} onClose={() => setSheet(null)} />
      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? nameOf(selected) : ''}
        subtitle={selected ? `${money(payAmount(selected))} · ${dateLabel(String(selected.date || ''), lang)} · ${t.kinds[payKind(selected)]}` : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        deleteLabel={t.deletePayment}
        onDelete={() => setSheet('delete')}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={t.deletePaymentTitle}
        text={selected ? t.deletePaymentText(money(payAmount(selected)), String(selected.account_name || '')) : ''}
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
  row: { flexDirection: 'row', gap: 12 },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
