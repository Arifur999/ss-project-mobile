import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { SIDE_LOOK, sideOf } from '@/constants/side';
import { useAmountShield } from '@/context/AmountShieldContext';

/** An account's standing at the top of its sheet, tinted by its side: "Tk 12,000 · Pawna". */
export function BalanceBox({
  label,
  balance,
  sideLabels,
}: {
  label: string;
  /** Signed: positive is Pawna, negative Dena. */
  balance: number;
  sideLabels: Record<'pawna' | 'dena' | 'balanced', string>;
}) {
  const { money } = useAmountShield();
  const side = sideOf(balance);
  const look = SIDE_LOOK[side];
  return (
    <View style={[styles.box, { backgroundColor: look.chipBg }]}>
      <Txt style={[styles.label, { color: look.chipInk }]}>{label}</Txt>
      <Txt style={[styles.value, { color: look.amount }]}>{`${money(Math.abs(balance))} · ${sideLabels[side]}`}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, borderRadius: 16, gap: 2 },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 22, fontWeight: '700' },
});
