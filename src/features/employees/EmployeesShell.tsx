import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { EMPLOYEE_COPY } from '@/features/employees/copy';
import { useEmployeeData } from '@/services/employees.services';

export type EmployeeSection = 'overview' | 'payments' | 'attendance' | 'list';

/** The four Employees screens' shared frame, fed by one query. */
export function EmployeesShell({
  section,
  fab,
  children,
}: {
  section: EmployeeSection;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(EMPLOYEE_COPY);
  const query = useEmployeeData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/employees' },
        { key: 'payments', label: t.sections.payments, route: '/more/employees/payments' },
        { key: 'attendance', label: t.sections.attendance, route: '/more/employees/attendance' },
        { key: 'list', label: t.sections.list, route: '/more/employees/list' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
