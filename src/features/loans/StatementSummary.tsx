import { StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Amber, Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { SIDE_LOOK, sideOf } from '@/features/loans/side';
import type { StatementFigures } from '@/features/loans/statement';

/** Who the statement is for, then opening, closing, paid and received, and the profit set apart. */
export function StatementSummary({ name, sub, figures }: { name: string; sub: string; figures: StatementFigures }) {
  const t = useCopy(LOAN_COPY);
  const { money } = useAmountShield();
  const opening = sideOf(figures.opening);
  const closing = sideOf(figures.closing);

  const profitParts = [
    figures.profitPaid ? t.profitPaidPart(money(figures.profitPaid)) : '',
    figures.profitReceived ? t.profitReceivedPart(money(figures.profitReceived)) : '',
  ].filter(Boolean);

  return (
    <>
      <View style={styles.who}>
        <View style={styles.initial}>
          <Txt style={styles.initialText}>{(name.trim().charAt(0) || '?').toUpperCase()}</Txt>
        </View>
        <View style={styles.whoText}>
          <Txt accessibilityRole="header" style={styles.name}>
            {name}
          </Txt>
          <Txt style={styles.sub}>{sub}</Txt>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <View style={styles.cell}>
            <Txt style={styles.cellLabel}>{t.opening}</Txt>
            <Txt style={styles.cellValue}>{money(Math.abs(figures.opening))}</Txt>
            <Txt style={[styles.cellCaptionStrong, { color: SIDE_LOOK[opening].ink }]}>{t.side[opening]}</Txt>
          </View>
          <View style={[styles.cell, styles.cellDark]}>
            <Txt style={[styles.cellLabel, styles.onDarkLabel]}>{t.closing}</Txt>
            <Txt style={[styles.cellValue, { color: White }]}>{money(Math.abs(figures.closing))}</Txt>
            <Txt style={[styles.cellCaptionStrong, { color: SIDE_LOOK[closing].onDark }]}>{t.sideLong[closing]}</Txt>
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.cell}>
            <Txt style={styles.cellLabel}>{t.paidDebit}</Txt>
            <Txt style={[styles.cellValue, { color: Red[600] }]}>{money(figures.paid)}</Txt>
            <Txt style={styles.cellCaption}>{t.addsToPawna}</Txt>
          </View>
          <View style={styles.cell}>
            <Txt style={styles.cellLabel}>{t.receivedCredit}</Txt>
            <Txt style={[styles.cellValue, { color: Green[700] }]}>{money(figures.received)}</Txt>
            <Txt style={styles.cellCaption}>{t.takesFromPawna}</Txt>
          </View>
        </View>
      </View>

      {profitParts.length ? (
        <View style={styles.profit}>
          <DesignIcon name="percent" size={18} color={Amber[900]} strokeWidth={2} />
          <Txt style={styles.profitText}>{profitParts.join(' · ') + t.profitTail}</Txt>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  initial: { width: 44, height: 44, borderRadius: 999, backgroundColor: Zinc[900], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initialText: { fontSize: 17, fontWeight: '700', color: White },
  whoText: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '600', lineHeight: 24.3, color: Zinc[900] },
  sub: { fontSize: 13, color: Zinc[600] },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: Zinc[200] },
  cellDark: { backgroundColor: Zinc[950], borderColor: Zinc[950] },
  cellLabel: { fontSize: 12, color: Zinc[500] },
  onDarkLabel: { color: 'rgba(255, 255, 255, 0.75)' },
  cellValue: { fontSize: 17, fontWeight: '600', color: Zinc[900] },
  cellCaption: { fontSize: 12, color: Zinc[500] },
  cellCaptionStrong: { fontSize: 12, fontWeight: '600' },
  profit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Amber[50],
    borderWidth: 1,
    borderColor: Amber[200],
  },
  profitText: { flex: 1, fontSize: 14, color: Amber[900] },
});
