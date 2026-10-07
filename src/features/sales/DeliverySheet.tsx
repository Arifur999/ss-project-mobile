import { HandoverSheet } from '@/components/HandoverSheet';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SALES_COPY } from '@/features/sales/copy';
import { formatNumber } from '@/lib/money';
import { pendingQty } from '@/lib/saleFigures';
import { useCustomerData } from '@/services/customers.services';
import { addSaleDelivery, useSaleWrite } from '@/services/sales.services';

type Row = Record<string, any>;

export type SaleLine = { sale: Row; item: Row };

/**
 * Sending out what is still owed on one sale line - the website's delivery
 * modal: the date, how many (all still pending by default, never more), who
 * took it out and a note. The server moves the line's delivered count and the
 * sale's delivery status with it.
 */
export function DeliverySheet({ line, onClose }: { line: SaleLine | null; onClose: () => void }) {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useSaleWrite();
  const { data } = useCustomerData();
  const pending = line ? pendingQty(line.item) : 0;

  return (
    <HandoverSheet
      seedKey={line ? String(line.item.id) : null}
      title={t.deliveryTitle}
      sub={`${line?.item.product_name ?? ''} · ${line?.sale.invoice_no ?? ''} · ${t.stillToGo(formatNumber(pending, lang))}`}
      max={pending}
      labels={{
        date: t.date,
        howMany: t.howMany,
        person: t.deliveredBy,
        personPlaceholder: t.deliveredByPlaceholder,
        notes: t.notes,
        optional: t.optional,
        save: t.save,
        saving: t.saving,
        cancel: t.cancel,
        close: t.close,
        error: t.errDeliver,
      }}
      people={data?.receivers}
      onSave={async ({ date, qty, person, notes }) => {
        if (!line) return;
        await write(() =>
          addSaleDelivery(String(line.sale.id), {
            sale_item_id: String(line.item.id),
            delivery_date: date,
            delivered_qty: qty,
            delivered_by: person,
            notes,
          }),
        );
        toast.show(t.deliveredDone);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
