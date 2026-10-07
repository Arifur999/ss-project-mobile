import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { useDamageData } from '@/services/damage.services';

export type DamageSection = 'overview' | 'entries' | 'receive' | 'transactions';

/** The four Damage screens' shared frame, fed by one query. */
export function DamageShell({
  section,
  fab,
  children,
}: {
  section: DamageSection;
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
}) {
  const t = useCopy(DAMAGE_COPY);
  const query = useDamageData();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/damage' },
        { key: 'entries', label: t.sections.entries, route: '/more/damage/entries' },
        { key: 'receive', label: t.sections.receive, route: '/more/damage/receive' },
        { key: 'transactions', label: t.sections.transactions, route: '/more/damage/transactions' },
      ]}
      query={query}
      errorText={t.loadError}
      retryLabel={t.retry}
      fab={fab}>
      {children}
    </SectionShell>
  );
}
