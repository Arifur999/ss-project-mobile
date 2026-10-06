import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { useLoanData } from '@/services/loans.services';

export type LoanSection = 'overview' | 'people' | 'transactions' | 'statement';

/** The four Loan screens' shared frame, fed by one query. */
export function LoanShell({
  section,
  fab,
  gap,
  children,
}: {
  section: LoanSection;
  fab?: { label: string; onPress: () => void } | null;
  gap?: number;
  children: ReactNode;
}) {
  const t = useCopy(LOAN_COPY);
  const query = useLoanData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/loans' },
        { key: 'people', label: t.sections.people, route: '/more/loans/people' },
        { key: 'transactions', label: t.sections.transactions, route: '/more/loans/transactions' },
        { key: 'statement', label: t.sections.statement, route: '/more/loans/statement' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}
      gap={gap}>
      {children}
    </SectionShell>
  );
}
