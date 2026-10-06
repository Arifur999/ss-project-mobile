import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { categoryColor, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang, type Lang } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { dateLabel, rangeLabel } from '@/lib/dates';
import { expenseSource } from '@/lib/expenseSource';

type Row = Record<string, any>;
type Copy = (typeof EXPENSE_COPY)['en'];

/** The note line under an expense: what wrote it (Payroll, Sales, Damage) and its details, or the typed note. */
export function expenseNote(row: Row, t: Copy, lang: Lang): { label: string; text: string } {
  const source = expenseSource(row);
  if (source?.kind === 'payroll') {
    const period = source.from && source.to ? rangeLabel(source.from, source.to, lang) : '';
    return { label: t.sources.payroll, text: t.payrollLine(source.payment, source.who, period) };
  }
  if (source?.kind === 'discount') return { label: t.sources.discount, text: t.dueDiscount(source.who) };
  if (source?.kind === 'damage') return { label: t.sources.damage, text: source.note };
  return { label: '', text: String(row.notes || '').trim() };
}

/** One expense in a day's group: category and colour, account, note, amount and the ⋮ menu. */
export function ExpenseRow({ row, colorOf, first, onMenu }: { row: Row; colorOf: (categoryId: string) => string | null | undefined; first: boolean; onMenu: () => void }) {
  const t = useCopy(EXPENSE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const note = expenseNote(row, t, lang);
  const amount = money(row.amount);
  const account = String(row.account_name || '').trim();

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <View style={styles.body}>
        <View style={styles.line}>
          <View style={[styles.dot, { backgroundColor: categoryColor(colorOf(row.category_id)) }]} />
          <Txt style={styles.cat}>{row.category_name}</Txt>
        </View>
        <Txt style={[styles.account, { color: account ? Zinc[600] : Zinc[500] }]}>{account || t.noAccount}</Txt>
        {note.text || note.label ? (
          <View style={styles.noteLine}>
            {note.label ? (
              <View style={styles.chip}>
                <Txt style={styles.chipText}>{note.label}</Txt>
              </View>
            ) : null}
            <Txt style={styles.note} numberOfLines={2}>
              {note.text}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt style={styles.amount}>{amount}</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.options(row.category_name, amount, dateLabel(String(row.date || ''), lang))}
        onPress={onMenu}
        style={styles.more}>
        <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 16, paddingRight: 4 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  body: { flex: 1, minWidth: 0, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  cat: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  account: { fontSize: 13 },
  noteLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  chip: { paddingHorizontal: 7, borderRadius: 999, backgroundColor: Zinc[100] },
  chipText: { fontSize: 12, fontWeight: '600', color: Zinc[700] },
  note: { flex: 1, fontSize: 13, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600', color: Red[600] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
