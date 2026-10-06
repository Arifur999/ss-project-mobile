import type { ReactNode } from 'react';

import { SectionShell } from '@/components/SectionShell';
import { useCopy } from '@/context/LanguageContext';
import { BALANCE_COPY } from '@/features/balance/copy';
import { useBalance } from '@/services/balance.services';

export type BalanceSection = 'overview' | 'transfers' | 'ledger' | 'wallet';

/** The four Balance screens' shared frame, fed by the one Balance query. */
export function BalanceShell({
  section,
  right,
  fab,
  children,
}: {
  section: BalanceSection;
  right?: ReactNode;
  fab?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  const t = useCopy(BALANCE_COPY);
  const query = useBalance();
  return (
    <SectionShell
      title={t.title}
      backLabel={t.backToMenu}
      current={section}
      sections={[
        { key: 'overview', label: t.sections.overview, route: '/more/balance' },
        { key: 'transfers', label: t.sections.transfers, route: '/more/balance/transfers' },
        { key: 'ledger', label: t.sections.ledger, route: '/more/balance/ledger' },
        { key: 'wallet', label: t.sections.wallet, route: '/more/balance/wallet' },
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
