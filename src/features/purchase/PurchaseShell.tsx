import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { useCan } from '@/hooks/useCan';
import { useSupplierData } from '@/services/supplier.services';

export type PurchaseSection = 'ledger' | 'receive' | 'history' | 'drafts';

type QueryState = { isPending: boolean; isError: boolean; isSuccess: boolean; isRefetching: boolean; refetch: () => unknown };

/**
 * The Purchase screens' shared frame, fed by the Supplier section's query - or,
 * for the drafts, the query the screen passes. History and Drafts show to
 * whoever the website's Product History and Draft Purchase pages admit.
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
        ...(can('purchaseHistory.view') ? [{ key: 'history' as const, label: t.sections.history, route: '/more/purchase/history' }] : []),
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
