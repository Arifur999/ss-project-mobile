import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Amber, Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { SIDE_LOOK, sideOf } from '@/features/loans/side';
import { dateLabel } from '@/lib/dates';
import type { LenderStatement } from '@/services/loans.services';

/** "Tk 1,000 · Pawna", or "Tk 0 · Balanced" - a balance with its side. */
export function useBalanceText() {
  const t = useCopy(LOAN_COPY);
  const { money } = useAmountShield();
  return (balance: number) => `${money(Math.abs(balance))} · ${t.side[sideOf(balance)]}`;
}

/**
 * The passbook: the opening balance, each entry with the balance after it
 * (a profit entry leaves it unchanged), then the closing balance.
 */
export function StatementLedger({ statement }: { statement: LenderStatement }) {
  const t = useCopy(LOAN_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const balText = useBalanceText();
  const opening = Number(statement.opening_principal || 0);
  const closing = Number(statement.closing_principal || 0);

  return (
    <View style={styles.list}>
      <View style={styles.edge}>
        <Txt style={styles.edgeLabel}>{t.openingBalance}</Txt>
        <Txt style={[styles.edgeValue, { color: SIDE_LOOK[sideOf(opening)].ink }]}>{balText(opening)}</Txt>
      </View>

      {statement.rows.map((entry) => {
        const row = entry.row;
        const isIn = Number(entry.credit || 0) > 0;
        const account = String(row.account_name || '');
        const running = Number(entry.running_principal || 0);
        return (
          <View key={String(row.id)} style={styles.entry}>
            <View style={styles.entryBody}>
              <Txt style={styles.date}>{dateLabel(String(row.date || ''), lang)}</Txt>
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: isIn ? Green[100] : Red[100] }]}>
                  <Txt style={[styles.chipText, { color: isIn ? Green[800] : Red[800] }]}>{isIn ? t.received : t.paid}</Txt>
                </View>
                {entry.is_profit ? (
                  <View style={[styles.chip, { backgroundColor: Amber[100] }]}>
                    <Txt style={[styles.chipText, { color: Amber[700] }]}>{t.profit}</Txt>
                  </View>
                ) : null}
              </View>
              <Txt style={styles.desc}>{isIn ? t.into(account) : t.outOf(account)}</Txt>
            </View>
            <View style={styles.entryFigures}>
              <Txt style={styles.amount}>{money(Number(entry.credit || 0) || Number(entry.debit || 0))}</Txt>
              <Txt style={[styles.balance, { color: entry.is_profit ? Zinc[500] : SIDE_LOOK[sideOf(running)].ink }]}>
                {entry.is_profit ? t.balanceUnchanged : t.bal(balText(running))}
              </Txt>
            </View>
          </View>
        );
      })}

      {statement.rows.length === 0 ? (
        <View style={styles.none}>
          <Txt style={styles.noneText}>{t.noEntries}</Txt>
        </View>
      ) : null}

      <View style={[styles.edge, styles.closeRow]}>
        <Txt style={styles.closeLabel}>{t.closingBalance}</Txt>
        <Txt style={[styles.closeValue, { color: SIDE_LOOK[sideOf(closing)].ink }]}>{balText(closing)}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  edge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Zinc[100] },
  closeRow: { borderTopWidth: 1, borderTopColor: Zinc[200] },
  edgeLabel: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  edgeValue: { fontSize: 14, fontWeight: '600' },
  closeLabel: { fontSize: 14, fontWeight: '700', color: Zinc[900] },
  closeValue: { fontSize: 15, fontWeight: '700' },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Zinc[100] },
  entryBody: { flex: 1, minWidth: 0, gap: 3 },
  date: { fontSize: 12, color: Zinc[500] },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
  desc: { fontSize: 14, color: Zinc[700] },
  entryFigures: { flexShrink: 0, alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  balance: { fontSize: 12, fontWeight: '600' },
  none: { paddingVertical: 20, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Zinc[100] },
  noneText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
