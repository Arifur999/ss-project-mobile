import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { useExpenseData } from '@/services/expenses.services';

export type ExpenseSection = 'overview' | 'transactions';

/** The two Expense screens' shared frame, fed by one query. */
export function ExpenseShell({
  section,
  right,
  fab,
  gap,
  children,
}: {
  section: ExpenseSection;
  right?: ReactNode;
  fab?: { label: string; onPress: () => void } | null;
  gap?: number;
  children: ReactNode;
}) {
  const t = useCopy(EXPENSE_COPY);
  const query = useExpenseData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/expenses' },
        { key: 'transactions', label: t.sections.transactions, route: '/more/expenses/transactions' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      right={right}
      fab={fab}
      gap={gap}>
      {children}
    </SectionShell>
  );
}
