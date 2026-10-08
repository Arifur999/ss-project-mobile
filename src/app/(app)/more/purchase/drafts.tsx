import { DraftList } from '@/features/drafts/DraftList';
import { PurchaseShell } from '@/features/purchase/PurchaseShell';
import { useCan } from '@/hooks/useCan';
import { useDrafts } from '@/services/drafts.services';

/** The parked purchase orders - the website's Draft Purchase. */
export default function PurchaseDraftsScreen() {
  const can = useCan();
  const query = useDrafts('purchase_order');
  return (
    <PurchaseShell section="drafts" query={query}>
      <DraftList
        kind="purchase_order"
        drafts={query.data ?? []}
        formRoute="/more/purchase/new"
        mayOpen={can('purchase.create')}
        mayDelete={can('purchaseDraft.write')}
      />
    </PurchaseShell>
  );
}
