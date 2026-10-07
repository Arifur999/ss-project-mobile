import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { useSupplierData } from '@/services/supplier.services';

export type SupplierSection = 'overview' | 'payments' | 'income' | 'list';

/** The four Supplier screens' shared frame, fed by one query. */
export function SupplierShell({
  section,
  fab,
  children,
}: {
  section: SupplierSection;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(SUPPLIER_COPY);
  const query = useSupplierData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/supplier' },
        { key: 'payments', label: t.sections.payments, route: '/more/supplier/payments' },
        { key: 'income', label: t.sections.income, route: '/more/supplier/income' },
        { key: 'list', label: t.sections.list, route: '/more/supplier/list' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
