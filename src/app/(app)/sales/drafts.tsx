import { DraftList } from '@/features/drafts/DraftList';
import { SalesShell } from '@/features/sales/SalesShell';
import { useCan } from '@/hooks/useCan';
import { useDrafts } from '@/services/drafts.services';

/** The parked invoices - the website's Draft Sales. */
export default function SaleDraftsScreen() {
  const can = useCan();
  const query = useDrafts('sale');
  return (
    <SalesShell section="drafts" query={query}>
      <DraftList kind="sale" drafts={query.data ?? []} formRoute="/sales/new" mayOpen={can('sale.create')} mayDelete={can('draft.write')} />
    </SalesShell>
  );
}
