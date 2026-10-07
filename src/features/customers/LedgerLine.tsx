import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { ledgerDetails } from '@/features/customers/ledgerText';
import type { LedgerEntry } from '@/lib/customerLedger';
import { dateLabel } from '@/lib/dates';

/**
 * One row of a customer's ledger: what it was, when and against which
 * invoice, how it moved the due - bought (+), discount and paid (−) - and the
 * due it left, which the next row starts from.
 */
export function LedgerLine({ entry, first }: { entry: LedgerEntry; first: boolean }) {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const moves = [
    entry.purchase > 0 ? { text: `+${money(entry.purchase)}`, color: Red[600] } : null,
    entry.discount > 0 ? { text: `${t.discount} −${money(entry.discount)}`, color: Zinc[600] } : null,
    entry.payment > 0 ? { text: `${t.totalPaid} −${money(entry.payment)}`, color: Green[700] } : null,
  ].filter((m) => m !== null);

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <View style={styles.body}>
        <Txt style={styles.title} numberOfLines={2}>
          {ledgerDetails(entry, t, lang)}
        </Txt>
        <Txt style={styles.meta} numberOfLines={1}>
          {[dateLabel(entry.date, lang), entry.reference].filter(Boolean).join(' · ')}
        </Txt>
        {moves.length ? (
          <View style={styles.moves}>
            {moves.map((m) => (
              <Txt key={m.text} style={[styles.move, { color: m.color }]}>
                {m.text}
              </Txt>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.due}>
        <Txt style={styles.dueLabel}>{t.colDue}</Txt>
        <Txt style={styles.dueValue}>{money(entry.current_due)}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
  moves: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, marginTop: 2 },
  move: { fontSize: 12, fontWeight: '600' },
  due: { flexShrink: 0, alignItems: 'flex-end' },
  dueLabel: { fontSize: 11, color: Zinc[500] },
  dueValue: { fontSize: 15, fontWeight: '700', color: Zinc[900] },
});
