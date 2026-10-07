import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { useCustomerData } from '@/services/customers.services';

export type CustomerSection = 'overview' | 'receipts' | 'ledger' | 'list';

/** The Customers tab's four screens' shared frame, fed by one query. A tab, so no back arrow. */
export function CustomersShell({
  section,
  fab,
  children,
}: {
  section: CustomerSection;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(CUSTOMER_COPY);
  const query = useCustomerData();
  return (
    <SectionShell
      title={t.title}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/customers' },
        { key: 'receipts', label: t.sections.receipts, route: '/customers/receipts' },
        { key: 'ledger', label: t.sections.ledger, route: '/customers/ledger' },
        { key: 'list', label: t.sections.list, route: '/customers/list' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
