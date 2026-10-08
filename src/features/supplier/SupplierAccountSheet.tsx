import { BalanceBox } from '@/components/BalanceBox';
import { ActionsSheet, type ExtraAction } from '@/components/ItemSheets';
import { TotalsList } from '@/components/TotalsList';
import { sideOf } from '@/constants/side';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import type { SupplierAccount } from '@/lib/supplierSummary';
import { callPhone } from '@/lib/phone';
import { supplierLabel } from '@/services/supplier.services';

/**
 * A supplier's account in full, as the website's dashboard row reads it:
 * opening position, order amount, SP, what is owed, what was paid, and the
 * balance - then Call, and Pay for whoever may.
 */
export function SupplierAccountSheet({
  account,
  onClose,
  onPay,
}: {
  account: SupplierAccount | null;
  onClose: () => void;
  onPay?: () => void;
}) {
  const t = useCopy(SUPPLIER_COPY);
  const { money } = useAmountShield();
  const name = supplierLabel(account?.supplier);
  const phone = String(account?.supplier.phone || '').trim();
  const balance = account?.availableBalance ?? 0;
  const opening = account?.openingBalance ?? 0;

  const cells = [
    { label: t.opening, value: `${money(Math.abs(opening))} · ${t.side[sideOf(opening)]}` },
    { label: t.orderAmount, value: money(account?.orderAmount) },
    { label: t.specialDiscount, value: money(account?.specialDiscount) },
    { label: t.actual, value: money(account?.actualAmount) },
    { label: t.payment, value: money(account?.paymentAmount) },
  ];
  const extra: ExtraAction[] = [
    ...(onPay ? [{ label: t.payThem, icon: 'banknote' as const, onPress: onPay }] : []),
    ...(phone ? [{ label: t.call(name, phone), icon: 'phone' as const, onPress: () => callPhone(phone) }] : []),
  ];

  return (
    <ActionsSheet
      open={!!account}
      onClose={onClose}
      title={name}
      subtitle={[account?.supplier.person_name, phone].filter(Boolean).join(' · ')}
      cancelLabel={t.close}
      closeLabel={t.close}
      extra={extra}>
      <BalanceBox label={t.available} balance={balance} sideLabels={t.side} />
      <TotalsList rows={cells} />
    </ActionsSheet>
  );
}
