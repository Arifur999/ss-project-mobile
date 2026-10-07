import { Pressable, StyleSheet, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Red } from '@/constants/theme';
import type { Account } from '@/lib/balance';

/** One part of a payment as typed: which account and how much. */
export type PaymentRow = { key: string; account_id: string; amount: string };

export type PaymentRowLabels = {
  account: string;
  chooseAccount: string;
  amount: string;
  remove: string;
  close: string;
  errAccount: string;
  errAmount: string;
};

/** One part of a payment - a due collection, a sale: the account it went into and how much, with Remove once it is split. */
export function PaymentRowFields({
  row,
  accounts,
  onChange,
  onRemove,
  errors,
  labels: t,
}: {
  row: PaymentRow;
  accounts: Account[];
  onChange: (patch: Partial<PaymentRow>) => void;
  onRemove?: () => void;
  errors?: { account?: true; amount?: true };
  labels: PaymentRowLabels;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.account}>
        <SelectField
          label={t.account}
          placeholder={t.chooseAccount}
          closeLabel={t.close}
          value={row.account_id}
          options={accounts.map((a) => ({ key: a.id, label: a.name }))}
          onChange={(account_id) => onChange({ account_id })}
          error={errors?.account ? t.errAccount : undefined}
        />
      </View>
      <View style={styles.amount}>
        <TextField
          tone="zinc"
          label={t.amount}
          placeholder="0"
          value={row.amount}
          onChangeText={(amount) => onChange({ amount })}
          error={errors?.amount ? t.errAmount : undefined}
          plainError
          keyboardType="decimal-pad"
          inputStyle={styles.figure}
        />
      </View>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.remove} onPress={onRemove} style={styles.remove}>
          <Txt style={styles.removeText}>{t.remove}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  account: { flexGrow: 1.4, flexBasis: 160, minWidth: 0 },
  amount: { flexGrow: 1, flexBasis: 110, minWidth: 0 },
  figure: { fontWeight: '600' },
  remove: { minHeight: 36, paddingHorizontal: 4, justifyContent: 'center', alignSelf: 'flex-end' },
  removeText: { fontSize: 14, fontWeight: '600', color: Red[700] },
});
