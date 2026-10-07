import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { SIDE_LOOK, sideOf } from '@/constants/side';
import { White, Zinc } from '@/constants/theme';
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
  const name = supplierLabel(account.supplier);
  const side = sideOf(account.availableBalance);
  const look = SIDE_LOOK[side];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${money(Math.abs(account.availableBalance))} ${t.side[side]}`}
      onPress={() => onPress(account)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Initial name={name} size={40} tone="soft" />
        <View style={styles.who}>
          <Txt style={styles.name} numberOfLines={2}>
            {name}
          </Txt>
          {account.supplier.phone ? <Txt style={styles.phone}>{account.supplier.phone}</Txt> : null}
        </View>
        <View style={styles.standing}>
          <Txt style={[styles.balance, { color: look.amount }]} numberOfLines={1}>
            {money(Math.abs(account.availableBalance))}
          </Txt>
          <View style={[styles.chip, { backgroundColor: look.chipBg }]}>
            <Txt style={[styles.chipText, { color: look.chipInk }]}>{t.side[side]}</Txt>
          </View>
        </View>
      </View>
      <View style={styles.figures}>
        <Txt style={styles.figure} numberOfLines={1}>{`${t.actual} ${money(account.actualAmount)}`}</Txt>
        <Txt style={styles.figure} numberOfLines={1}>{`${t.payment} ${money(account.paymentAmount)}`}</Txt>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  phone: { fontSize: 13, color: Zinc[500] },
  standing: { flexShrink: 0, maxWidth: '42%', alignItems: 'flex-end', gap: 4 },
  balance: { fontSize: 16, fontWeight: '700' },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
  figures: { flexDirection: 'row', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: Zinc[100] },
  figure: { flex: 1, minWidth: 0, fontSize: 12, color: Zinc[600] },
});
