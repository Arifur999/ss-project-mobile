import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { useCustomerData } from '@/services/customers.services';

export type SalesSection = 'invoices' | 'items';

/** The Sales tab's screens' shared frame, fed by the query it shares with Customers. A tab, so no back arrow. */
export function SalesShell({
  section,
  fab,
  children,
}: {
  section: SalesSection;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(SALES_COPY);
  const query = useCustomerData();
  return (
    <SectionShell
      title={t.title}
      current={section}
      sections={[
        { key: 'invoices', label: t.sections.invoices, route: '/sales' },
        { key: 'items', label: t.sections.items, route: '/sales/items' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
