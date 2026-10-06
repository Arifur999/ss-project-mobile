import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { Amber, Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { loanDisplayName, transactionAmounts } from '@/lib/loans';

type Row = Record<string, any>;

/**
 * One loan transaction in a day's group: who, a Received / Paid chip (and
 * Profit), the account and any note, the signed amount and the ⋮ menu.
 */
export function LoanTxnRow({ record, first, onMenu }: { record: Row; first: boolean; onMenu: () => void }) {
  const t = useCopy(LOAN_COPY);
  const { money } = useAmountShield();
  const amounts = transactionAmounts(record);
  const isIn = amounts.type !== 'payment';
  const amount = money(amounts.received || amounts.paid);
  const name = loanDisplayName(record);
  const note = String(record.notes || '').trim();

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <Initial name={name} size={40} tone="soft" />
      <View style={styles.body}>
        <Txt style={styles.name}>{name}</Txt>
        <View style={styles.meta}>
          <View style={[styles.chip, { backgroundColor: isIn ? Green[100] : Red[100] }]}>
            <Txt style={[styles.chipText, { color: isIn ? Green[800] : Red[800] }]}>{isIn ? t.received : t.paid}</Txt>
          </View>
          {amounts.isProfit ? (
            <View style={[styles.chip, { backgroundColor: Amber[100] }]}>
              <Txt style={[styles.chipText, { color: Amber[700] }]}>{t.profit}</Txt>
            </View>
          ) : null}
          {record.account_name ? <Txt style={styles.account}>{record.account_name}</Txt> : null}
        </View>
        {note ? <Txt style={styles.note}>{note}</Txt> : null}
      </View>
      <Txt style={[styles.amount, { color: isIn ? Green[700] : Red[600] }]}>{`${isIn ? '+' : '−'}${amount}`}</Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={t.txnOptions(isIn, name, amount)} onPress={onMenu} style={styles.more}>
        <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 4 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  body: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
  account: { fontSize: 13, color: Zinc[600] },
  note: { fontSize: 13, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600' },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
