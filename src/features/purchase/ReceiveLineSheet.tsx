import { HandoverSheet } from '@/components/HandoverSheet';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { formatNumber } from '@/lib/money';
import { receivePurchaseLine, usePurchaseWrite } from '@/services/purchase.services';

type Row = Record<string, any>;

export type PurchaseLine = { purchase: Row; item: Row; received: number; due: number };

/**
 * Taking delivery of one line - Hatim's Product Received: the date, how many
 * arrived (all still due by default, never more), who took them and a note.
 * The server records it, adds the stock and its FIFO cost, and updates the
 * order's status, in one transaction.
 */
export function ReceiveLineSheet({ line, onClose }: { line: PurchaseLine | null; onClose: () => void }) {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = usePurchaseWrite();
  const due = line?.due ?? 0;

  return (
    <HandoverSheet
      seedKey={line ? String(line.item.id) : null}
      title={t.receiveTitle}
      sub={`${line?.item.product_name ?? ''} · ${line?.purchase.si_no ?? ''} · ${t.stillDue(formatNumber(due, lang))}`}
      max={due}
      labels={{
        date: t.date,
        howMany: t.howMany,
        person: t.receivedBy,
        personPlaceholder: t.receivedByPlaceholder,
        notes: t.notes,
        optional: t.optional,
        save: t.save,
        saving: t.saving,
        cancel: t.cancel,
        close: t.close,
        error: t.errReceive,
      }}
      onSave={async ({ date, qty, person, notes }) => {
        if (!line) return;
        await write(() =>
          receivePurchaseLine(String(line.purchase.id), {
            purchase_item_id: String(line.item.id),
            receive_date: date,
            receiver_name: person,
            received_qty: qty,
            condition: 'good',
            notes,
          }),
        );
        toast.show(t.received);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
