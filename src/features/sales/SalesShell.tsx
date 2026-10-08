import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { useCan } from '@/hooks/useCan';
import { useCustomerData } from '@/services/customers.services';

export type SalesSection = 'invoices' | 'items' | 'drafts';

type QueryState = { isPending: boolean; isError: boolean; isSuccess: boolean; isRefetching: boolean; refetch: () => unknown };

/**
 * The Sales tab's screens' shared frame, fed by the query it shares with
 * Customers - or, for the drafts, the query the screen passes. Drafts shows
 * to whoever the website's Draft Sales page admits. A tab, so no back arrow.
 */
export function SalesShell({
  section,
  query,
  fab,
  children,
}: {
  section: SalesSection;
  query?: QueryState;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(SALES_COPY);
  const can = useCan();
  const sales = useCustomerData();
  return (
    <SectionShell
      title={t.title}
      current={section}
      sections={[
        { key: 'invoices', label: t.sections.invoices, route: '/sales' },
        { key: 'items', label: t.sections.items, route: '/sales/items' },
        ...(can('saleDraft.list') ? [{ key: 'drafts' as const, label: t.sections.drafts, route: '/sales/drafts' }] : []),
      ]}
      query={query ?? sales}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
