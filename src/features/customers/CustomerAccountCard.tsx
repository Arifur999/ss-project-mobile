import { memo } from 'react';

import { AccountCard } from '@/components/AccountCard';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import type { CustomerDashboardRow } from '@/lib/customerDue';

/**
 * A customer on the overview: who and where, what they owe now (Pawna) or
 * hold in credit (Dena), and what they bought against what was collected.
 */
export const CustomerAccountCard = memo(function CustomerAccountCard({
  customer,
  onPress,
}: {
  customer: CustomerDashboardRow;
  onPress: (customer: CustomerDashboardRow) => void;
}) {
  const t = useCopy(CUSTOMER_COPY);
  const { money } = useAmountShield();
  return (
    <AccountCard
      name={customer.name}
      sub={[customer.phone, customer.address].filter(Boolean).join(' · ')}
      balance={customer.currentDue}
      sideLabels={t.side}
      figures={[`${t.totalPurchase} ${money(customer.totalPurchase)}`, `${t.collections} ${money(customer.collectionsAmount)}`]}
      onPress={() => onPress(customer)}
    />
  );
});
