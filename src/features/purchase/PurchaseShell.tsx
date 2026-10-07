import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { useSupplierData } from '@/services/supplier.services';

export type PurchaseSection = 'ledger' | 'receive';

/** The Purchase screens' shared frame, fed by the Supplier section's query. */
export function PurchaseShell({
  section,
  fab,
  children,
}: {
  section: PurchaseSection;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(PURCHASE_COPY);
  const query = useSupplierData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'ledger', label: t.sections.ledger, route: '/more/purchase' },
        { key: 'receive', label: t.sections.receive, route: '/more/purchase/receive' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
