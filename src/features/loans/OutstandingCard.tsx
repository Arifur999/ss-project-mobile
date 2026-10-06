import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { Amber, Blue, Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { SIDE_LOOK, sideOf } from '@/features/loans/side';
import type { Lender } from '@/services/loans.services';

/** One lender's running totals, as buildLoanSummary returns them. */
export type LoanSummary = {
  key: string;
  lender: Lender | null;
  name: string;
  opening: number;
  received: number;
  paid: number;
  profit: number;
  balance: number;
  transactions: number;
};

export const summaryPhone = (item: LoanSummary) => String(item.lender?.phone || '').trim();

/**
 * A bank or person on the loan overview: who, where they stand, the four
 * running figures, then SMS and Statement.
 */
export function OutstandingCard({ item, onSms, onStatement }: { item: LoanSummary; onSms: () => void; onStatement: () => void }) {
  const t = useCopy(LOAN_COPY);
  const { money } = useAmountShield();
  const side = sideOf(item.balance);
  const look = SIDE_LOOK[side];
  const phone = summaryPhone(item);

  const figures = [
    { label: t.opening, value: item.opening, color: Zinc[900] },
    { label: t.receive, value: item.received, color: Green[700] },
    { label: t.payment, value: item.paid, color: Red[600] },
    { label: t.profit, value: item.profit, color: item.profit ? Amber[700] : Zinc[500] },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Initial name={item.name} size={40} tone="soft" />
        <View style={styles.who}>
          <Txt style={styles.name}>{item.name}</Txt>
          {phone ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t.call(item.name, phone)}
              onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})}
              style={styles.phone}>
              <Txt style={styles.phoneText}>{phone}</Txt>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.standing}>
          <Txt style={[styles.balance, { color: look.amount }]}>{money(Math.abs(item.balance))}</Txt>
          <View style={[styles.chip, { backgroundColor: look.chipBg }]}>
            <Txt style={[styles.chipText, { color: look.chipInk }]}>{t.side[side]}</Txt>
          </View>
        </View>
      </View>

      <View style={styles.figures}>
        {figures.map((f) => (
          <View key={f.label} style={styles.figure}>
            <Txt style={styles.figLabel}>{f.label}</Txt>
            <Txt style={[styles.figValue, { color: f.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {money(f.value)}
            </Txt>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onSms} style={styles.action}>
          <DesignIcon name="message" size={16} color={Zinc[900]} strokeWidth={2} />
          <Txt style={styles.actionText}>{t.sms}</Txt>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={onStatement} style={[styles.action, styles.actionDivider]}>
          <DesignIcon name="book" size={16} color={Zinc[900]} strokeWidth={2} />
          <Txt style={styles.actionText}>{t.statement}</Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10 },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 22.4, color: Zinc[900] },
  phone: { alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center' },
  phoneText: { fontSize: 13, color: Blue[700] },
  standing: { flexShrink: 0, alignItems: 'flex-end', gap: 4 },
  balance: { fontSize: 16, fontWeight: '600' },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
  figures: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 12 },
  figure: { flex: 1, minWidth: 0 },
  figLabel: { fontSize: 11, color: Zinc[500] },
  figValue: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Zinc[100] },
  action: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionDivider: { borderLeftWidth: 1, borderLeftColor: Zinc[100] },
  actionText: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
});
