import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { useCan } from '@/hooks/useCan';
import { useSupplierData } from '@/services/supplier.services';

export type PurchaseSection = 'ledger' | 'receive' | 'drafts';

type QueryState = { isPending: boolean; isError: boolean; isSuccess: boolean; isRefetching: boolean; refetch: () => unknown };

/**
 * The Purchase screens' shared frame, fed by the Supplier section's query - or,
 * for the drafts, the query the screen passes. Drafts shows to whoever the
 * website's Draft Purchase page admits.
 */
export function PurchaseShell({
  section,
  query,
  fab,
  children,
}: {
  section: PurchaseSection;
  query?: QueryState;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(PURCHASE_COPY);
  const can = useCan();
  const purchases = useSupplierData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'ledger', label: t.sections.ledger, route: '/more/purchase' },
        { key: 'receive', label: t.sections.receive, route: '/more/purchase/receive' },
        ...(can('purchaseDraft.list') ? [{ key: 'drafts' as const, label: t.sections.drafts, route: '/more/purchase/drafts' }] : []),
      ]}
      query={query ?? purchases}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
