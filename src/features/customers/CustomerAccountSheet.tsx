import { BalanceBox } from '@/components/BalanceBox';
import { ActionsSheet, type ExtraAction } from '@/components/ItemSheets';
import { TotalsList } from '@/components/TotalsList';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import type { CustomerDashboardRow } from '@/lib/customerDue';
import { callPhone } from '@/lib/phone';

/**
 * A customer's account in full, as the website's dashboard row reads it:
 * opening due, what they bought, the discounts, what was collected and the
 * current due - then Receive due, the ledger and the reminder SMS for whoever
 * may, and Call.
 */
export function CustomerAccountSheet({
  customer,
  onClose,
  onReceive,
  onLedger,
  onRemind,
}: {
  customer: CustomerDashboardRow | null;
  onClose: () => void;
  onReceive?: () => void;
  onLedger?: () => void;
  onRemind?: () => void;
}) {
  const t = useCopy(CUSTOMER_COPY);
  const { money } = useAmountShield();
  const phone = String(customer?.phone || '').trim();

  const extra: ExtraAction[] = [
    ...(onReceive ? [{ label: t.receiveDue, icon: 'banknote' as const, onPress: onReceive }] : []),
    ...(onLedger ? [{ label: t.viewLedger, icon: 'fileText' as const, onPress: onLedger }] : []),
    ...(onRemind ? [{ label: t.sendReminder, icon: 'message' as const, onPress: onRemind }] : []),
    ...(phone
      ? [{ label: t.call(customer?.name ?? '', phone), icon: 'phone' as const, onPress: () => callPhone(phone) }]
      : []),
  ];

  return (
    <ActionsSheet
      open={!!customer}
      onClose={onClose}
      title={customer?.name ?? ''}
      subtitle={[phone, customer?.address].filter(Boolean).join(' · ')}
      cancelLabel={t.close}
      closeLabel={t.close}
      extra={extra}>
      <BalanceBox label={t.currentDue} balance={customer?.currentDue ?? 0} sideLabels={t.side} />
      <TotalsList
        rows={[
          { label: t.openingDue, value: money(customer?.openingDue) },
          { label: t.totalPurchase, value: money(customer?.totalPurchase) },
          { label: t.discount, value: money(customer?.totalDiscount) },
          { label: t.collections, value: money(customer?.collectionsAmount) },
          { label: t.extraDiscount, value: money(customer?.extraDiscount) },
        ]}
      />
    </ActionsSheet>
  );
}
