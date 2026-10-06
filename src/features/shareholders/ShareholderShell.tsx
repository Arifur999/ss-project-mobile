import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { useShareholderData } from '@/services/shareholders.services';

export type ShareholderSection = 'overview' | 'invest' | 'profit' | 'list';

/** The four Shareholder screens' shared frame, fed by one query. */
export function ShareholderShell({
  section,
  right,
  fab,
  children,
}: {
  section: ShareholderSection;
  right?: ReactNode;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(SHAREHOLDER_COPY);
  const query = useShareholderData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/shareholders' },
        { key: 'invest', label: t.sections.invest, route: '/more/shareholders/invest' },
        { key: 'profit', label: t.sections.profit, route: '/more/shareholders/profit' },
        { key: 'list', label: t.sections.list, route: '/more/shareholders/list' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      right={right}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
