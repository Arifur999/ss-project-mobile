import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';

export type ReportSection = 'summary' | 'sales' | 'purchase';

type QueryState = { isPending: boolean; isError: boolean; isSuccess: boolean; isRefetching: boolean; refetch: () => unknown };

/**
 * The Target & Report screens' shared frame. The summary is fed by its
 * period's report and the target screens by the targets, so each passes the
 * query it shows.
 */
export function ReportsShell({
  section,
  query,
  fab,
  children,
}: {
  section: ReportSection;
  query: QueryState;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(REPORT_COPY);
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'summary', label: t.sections.summary, route: '/more/reports' },
        { key: 'sales', label: t.sections.sales, route: '/more/reports/sales-target' },
        { key: 'purchase', label: t.sections.purchase, route: '/more/reports/purchase-target' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
