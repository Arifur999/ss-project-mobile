import { memo } from 'react';

import { AccountCard } from '@/components/AccountCard';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import type { SupplierAccount } from '@/lib/supplierSummary';
import { supplierLabel } from '@/services/supplier.services';

/**
 * A supplier on the overview: who, where the account stands (Dena when we
 * owe them), and what was owed for orders against what was paid.
 */
export const SupplierAccountCard = memo(function SupplierAccountCard({
  account,
  onPress,
}: {
  account: SupplierAccount;
  onPress: (account: SupplierAccount) => void;
}) {
  const t = useCopy(SUPPLIER_COPY);
  const { money } = useAmountShield();
  return (
    <AccountCard
      name={supplierLabel(account.supplier)}
      sub={account.supplier.phone}
      balance={account.availableBalance}
      sideLabels={t.side}
      figures={[`${t.actual} ${money(account.actualAmount)}`, `${t.payment} ${money(account.paymentAmount)}`]}
      onPress={() => onPress(account)}
    />
  );
});
