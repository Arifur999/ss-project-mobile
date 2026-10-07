import { Linking, StyleSheet, View } from 'react-native';

import { ActionsSheet, type ExtraAction } from '@/components/ItemSheets';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { SIDE_LOOK, sideOf } from '@/constants/side';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import type { SupplierAccount } from '@/lib/supplierSummary';
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
  const side = sideOf(balance);

  const cells = [
    { label: t.opening, value: `${money(Math.abs(opening))} · ${t.side[sideOf(opening)]}` },
    { label: t.orderAmount, value: money(account?.orderAmount) },
    { label: t.specialDiscount, value: money(account?.specialDiscount) },
    { label: t.actual, value: money(account?.actualAmount) },
    { label: t.payment, value: money(account?.paymentAmount) },
  ];
  const extra: ExtraAction[] = [
    ...(onPay ? [{ label: t.payThem, icon: 'banknote' as const, onPress: onPay }] : []),
    ...(phone ? [{ label: t.call(name, phone), icon: 'phone' as const, onPress: () => Linking.openURL(`tel:${phone}`).catch(() => {}) }] : []),
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
      <View style={[styles.balance, { backgroundColor: SIDE_LOOK[side].chipBg }]}>
        <Txt style={[styles.balanceLabel, { color: SIDE_LOOK[side].chipInk }]}>{t.available}</Txt>
        <Txt style={[styles.balanceValue, { color: SIDE_LOOK[side].amount }]}>{`${money(Math.abs(balance))} · ${t.side[side]}`}</Txt>
      </View>
      <TotalsList rows={cells} />
    </ActionsSheet>
  );
}

const styles = StyleSheet.create({
  balance: { padding: 14, borderRadius: 16, gap: 2 },
  balanceLabel: { fontSize: 12, fontWeight: '600' },
  balanceValue: { fontSize: 22, fontWeight: '700' },
});
