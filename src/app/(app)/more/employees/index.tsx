import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { FiguresCard } from '@/components/FiguresCard';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Blue, Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { EmployeesShell } from '@/features/employees/EmployeesShell';
import { dateLabel } from '@/lib/dates';
import { employeeTotals, workingDuration } from '@/lib/employees';
import { formatNumber } from '@/lib/money';
import { matches } from '@/lib/search';
import { useEmployeeData } from '@/services/employees.services';

/** Who works here and what each has been paid - Hatim's Employee Dashboard. */
export default function EmployeeOverviewScreen() {
  const t = useCopy(EMPLOYEE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const { data } = useEmployeeData();
  const [search, setSearch] = useState('');

  const num = (n: unknown) => formatNumber(n, lang);
  const employees = data?.employees ?? [];
  const totals = employeeTotals(employees, data?.payments ?? []);
  const shown = employees.filter((e) => matches(search, e.name, e.phone, e.address));

  return (
    <EmployeesShell section="overview">
      <FigureCard
        dark
        label={t.totalPaid}
        value={money(totals.totalSalary + totals.totalBonus)}
        caption={t.counts(num(totals.totalEmployees), num(totals.activeEmployees), num(totals.resignedEmployees))}
        badge={{ icon: 'idCard', bg: 'rgba(255, 255, 255, 0.12)', ink: White }}
      />
      <View style={styles.row}>
        <FigureCard label={t.totalSalary} value={money(totals.totalSalary)} valueColor={Green[700]} />
        <FigureCard label={t.totalBonus} value={money(totals.totalBonus)} valueColor={Blue[700]} />
      </View>

      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchEmployees} label={t.searchLabel} />
      {shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{employees.length === 0 ? t.noEmployees : t.noMatch}</Txt>
        </View>
      ) : (
        shown.map((employee) => {
          const paid = totals.byEmployee[employee.id] ?? { salary: 0, bonus: 0 };
          const worked = workingDuration(employee);
          return (
            <FiguresCard
              key={employee.id}
              title={employee.name}
              meta={[employee.phone, employee.address].filter(Boolean).join(' · ')}
              sub={[
                employee.join_date ? t.joined(dateLabel(String(employee.join_date), lang)) : '',
                employee.resign_date ? t.resignedOn(dateLabel(String(employee.resign_date), lang)) : '',
                worked ? `${t.workingFor} ${t.duration(num(worked.months), num(worked.days))}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              badge={employee.is_active ? undefined : { label: t.resignedBadge, bg: Red[50], ink: Red[700] }}
              figures={[
                { label: t.salary, value: money(paid.salary) },
                { label: t.bonus, value: money(paid.bonus) },
                { label: t.subtotal, value: money(paid.salary + paid.bonus), strong: true },
              ]}
            />
          );
        })
      )}
    </EmployeesShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
