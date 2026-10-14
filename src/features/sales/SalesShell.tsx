import { router } from 'expo-router';
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
 *
 * New sale is on every section, for whoever the website's New Sales Entry page
 * admits: that tick is its own, and a member holding it without the Sales
 * Ledger would otherwise never find the form.
 */
export function SalesShell({
  section,
  query,
  children,
}: {
  section: SalesSection;
  query?: QueryState;
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
      fab={can('sale.create') ? { label: t.newSale, onPress: () => router.push('/sales/new') } : null}>
      {children}
    </SectionShell>
  );
}
