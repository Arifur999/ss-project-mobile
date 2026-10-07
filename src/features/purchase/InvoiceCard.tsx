import { memo } from 'react';

import { DocumentCard } from '@/components/DocumentCard';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { RECEIVE_LOOK, shippingState } from '@/features/purchase/status';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { invoiceMetrics } from '@/lib/purchaseOrder';

type Row = Record<string, any>;

/** A purchase invoice in the ledger: number, date, status, supplier, pieces and grand total. */
export const InvoiceCard = memo(function InvoiceCard({ purchase, supplier, onPress }: { purchase: Row; supplier: string; onPress: (purchase: Row) => void }) {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const metrics = invoiceMetrics(purchase);
  const state = shippingState(purchase.shipping_status);
  return (
    <DocumentCard
      number={String(purchase.si_no || '')}
      date={dateLabel(String(purchase.date || ''), lang)}
      badge={{ label: t.statuses[state], ...RECEIVE_LOOK[state] }}
      title={supplier}
      figures={`${t.pcs(formatNumber(metrics.quantity, lang))} · ${money(metrics.grandTotal)}`}
      label={`${purchase.si_no}, ${supplier}, ${money(metrics.grandTotal)}, ${t.statuses[state]}`}
      onPress={() => onPress(purchase)}
    />
  );
});
