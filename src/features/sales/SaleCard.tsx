import { memo } from 'react';

import { DocumentCard } from '@/components/DocumentCard';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { DELIVERY_LOOK } from '@/features/sales/status';
import { saleDue } from '@/lib/customerDue';
import { dateLabel } from '@/lib/dates';
import { deliveryStatus, saleSubtotalAfterDiscount } from '@/lib/saleFigures';

type Row = Record<string, any>;

/** A sale in the ledger: invoice, date, delivery state, customer, the amount after discount, and what is paid and owed. */
export const SaleCard = memo(function SaleCard({ sale, onPress }: { sale: Row; onPress: (sale: Row) => void }) {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const state = deliveryStatus(sale);
  const customer = String(sale.customer_name || '') || t.walkIn;
  const amount = money(saleSubtotalAfterDiscount(sale));
  return (
    <DocumentCard
      number={String(sale.invoice_no || '')}
      date={dateLabel(String(sale.date || ''), lang)}
      badge={{ label: t.deliveryStates[state], ...DELIVERY_LOOK[state] }}
      title={customer}
      figures={amount}
      sub={t.paidDue(money(sale.paid_amount), money(Math.max(0, saleDue(sale))))}
      label={`${sale.invoice_no}, ${customer}, ${amount}, ${t.deliveryStates[state]}`}
      onPress={() => onPress(sale)}
    />
  );
});
