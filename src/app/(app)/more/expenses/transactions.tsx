import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';
import { ExpenseFormSheet } from '@/features/expenses/ExpenseFormSheet';
import { expenseNote, ExpenseRow } from '@/features/expenses/ExpenseRow';
import { ExpenseShell } from '@/features/expenses/ExpenseShell';
import { dateLabel, monthName, rangeLabel } from '@/lib/dates';
import { expenseSource } from '@/lib/expenseSource';
import { errorMessage } from '@/lib/httpClient';
import { printTable } from '@/lib/print';
import { deleteExpense, useExpenseData, useExpenseWrite } from '@/services/expenses.services';

type Row = Record<string, any>;

const ALL = '__all';
// A slice at a time, as the website's useProgressiveRows draws them; the
// total always covers every matching row.
const PAGE = 40;

/** Every expense, newest first, grouped by day - Hatim's ExpenseTransactions. */
export default function ExpenseTransactionsScreen() {
  const t = useCopy(EXPENSE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useExpenseWrite();
  const { data } = useExpenseData();
  const expenses = useMemo(() => data?.expenses ?? [], [data?.expenses]);
  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const params = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(ALL);
  const [cat, setCat] = useState(params.category || ALL);
  const [seededFrom, setSeededFrom] = useState(params.category ?? '');
  const [limit, setLimit] = useState(PAGE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Opened again from a category's "View transactions": filter to that one.
  if ((params.category ?? '') !== seededFrom) {
    setSeededFrom(params.category ?? '');
    if (params.category) setCat(params.category);
  }

  const colorOf = (id: string) => categories.find((c) => c.id === id)?.color;
  const catName = categories.find((c) => c.id === cat)?.name ?? '';
  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return `${monthName(m, lang)} ${lang === 'bn' ? bnDigits(y) : y}`;
  };
  const months = useMemo(() => [...new Set(expenses.map((e) => String(e.date || '').slice(0, 7)).filter(Boolean))].sort().reverse(), [expenses]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        if (month !== ALL && String(e.date || '').slice(0, 7) !== month) return false;
        if (cat !== ALL && e.category_id !== cat) return false;
        if (!q) return true;
        const note = expenseNote(e, t, lang);
        return [e.category_name, e.account_name, note.text, note.label, String(Number(e.amount || 0))].join(' ').toLowerCase().includes(q);
      }),
    [expenses, month, cat, q, t, lang],
  );
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  const isFiltered = month !== ALL || cat !== ALL || !!q;

  const scope = q
    ? t.matching(query.trim())
    : cat !== ALL && month !== ALL
      ? t.catMonth(catName, monthLabel(month))
      : cat !== ALL
        ? t.catAllTime(catName)
        : month !== ALL
          ? t.spentIn(monthLabel(month))
          : t.totalSpent;

  const groups: { day: string; rows: Row[]; sum: number }[] = [];
  filtered.slice(0, limit).forEach((e) => {
    const day = String(e.date || '').slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.rows.push(e);
      last.sum += Number(e.amount || 0);
    } else groups.push({ day, rows: [e], sum: Number(e.amount || 0) });
  });

  const clear = () => {
    setQuery('');
    setMonth(ALL);
    setCat(ALL);
    setLimit(PAGE);
  };

  const print = () =>
    printTable({
      title: t.printTitle,
      subtitle: scope,
      columns: [{ label: t.colNo }, { label: t.colDate }, { label: t.colCategory }, { label: t.colAmount, align: 'right' }, { label: t.colAccount }, { label: t.colNotes }],
      rows: filtered.map((e, i) => [i + 1, dateLabel(String(e.date || ''), lang), e.category_name, money(e.amount), e.account_name || '-', expenseNote(e, t, lang).text]),
      footer: [[t.total, money(total)]],
    }).catch((e) => toast.show(errorMessage(e)));

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteExpense(selected.id));
      setSheet(null);
      toast.show(t.expenseDeleted);
    } catch (e) {
      setSheet(null);
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  // What the actions and delete sheets say about the chosen row.
  const sel = (() => {
    if (!selected) return null;
    const amount = money(selected.amount);
    const date = dateLabel(String(selected.date || ''), lang);
    const account = String(selected.account_name || '').trim();
    const source = expenseSource(selected);
    let sourceText = '';
    if (source?.kind === 'payroll') {
      sourceText = t.payrollFrom(source.payment, source.who, source.from && source.to ? rangeLabel(source.from, source.to, lang) : '');
    } else if (source?.kind === 'discount') sourceText = t.discountFrom(source.who);
    else if (source?.kind === 'damage') sourceText = t.damageFrom;
    return {
      title: `${selected.category_name} · ${amount}`,
      summary: `${account || t.noAccountShort} · ${date}`,
      sourceText,
      note: source ? '' : String(selected.notes || '').trim(),
      deleteText:
        t.deleteWhat(amount, selected.category_name, date) +
        (account ? t.goesBack(amount, account) : '') +
        (source?.kind === 'payroll' ? t.payrollStays : ''),
    };
  })();

  return (
    <ExpenseShell
      section="transactions"
      gap={12}
      right={<HeaderIconButton icon="printer" label={t.printList} onPress={print} disabled={filtered.length === 0} />}
      fab={{
        label: t.newExpense,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <SearchField height={50} value={query} onChangeText={setQuery} placeholder={t.searchPlaceholder} label={t.searchLabel} />

      <View accessibilityLabel={t.filtersLabel} style={styles.filters}>
        <SelectPill
          shape="pill"
          label={t.filterMonth}
          value={month}
          active={month !== ALL}
          onChange={(m) => {
            setMonth(m);
            setLimit(PAGE);
          }}
          closeLabel={t.close}
          options={[{ key: ALL, label: t.allMonths }, ...months.map((m) => ({ key: m, label: monthLabel(m) }))]}
          style={styles.monthFilter}
        />
        <SelectPill
          shape="pill"
          label={t.filterCategory}
          value={cat}
          active={cat !== ALL}
          onChange={(c) => {
            setCat(c);
            setLimit(PAGE);
          }}
          closeLabel={t.close}
          options={[{ key: ALL, label: t.allCategories }, ...categories.map((c) => ({ key: c.id, label: c.name }))]}
          style={styles.catFilter}
        />
      </View>

      <View style={styles.totalBox}>
        <View style={styles.totalText}>
          <Txt style={styles.scope}>{scope}</Txt>
          <Txt style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {money(total)}
          </Txt>
        </View>
        {isFiltered ? (
          <Pressable accessibilityRole="button" onPress={clear} style={styles.clear}>
            <Txt style={styles.clearText}>{t.clearFilters}</Txt>
          </Pressable>
        ) : null}
      </View>

      <Txt accessibilityRole="header" style={styles.count}>
        {t.countExpenses(filtered.length)}
      </Txt>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{isFiltered ? t.emptyFiltered : t.emptyAll}</Txt>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.day} style={styles.group}>
          <View style={styles.groupHead}>
            <Txt accessibilityRole="header" style={styles.groupLabel}>
              {dateLabel(group.day, lang)}
            </Txt>
            <Txt style={styles.groupLabel}>{money(group.sum)}</Txt>
          </View>
          <View style={styles.groupList}>
            {group.rows.map((row, i) => (
              <ExpenseRow
                key={row.id}
                row={row}
                colorOf={colorOf}
                first={i === 0}
                onMenu={() => {
                  setSelected(row);
                  setSheet('actions');
                }}
              />
            ))}
          </View>
        </View>
      ))}

      {filtered.length > limit ? (
        <Button title={t.loadOlder} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} style={styles.older} />
      ) : null}

      <ExpenseFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={sel?.title ?? ''}
        subtitle={sel?.summary ?? ''}
        editLabel={t.editExpense}
        deleteLabel={t.deleteExpense}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        onEdit={() => {
          setSheet(null);
          setEditing(selected);
          setFormOpen(true);
        }}
        onDelete={() => setSheet('confirm')}>
        {sel?.sourceText ? (
          <View style={styles.source}>
            <DesignIcon name="link" size={18} color={Zinc[700]} strokeWidth={2} />
            <Txt style={styles.sourceText}>{sel.sourceText}</Txt>
          </View>
        ) : null}
        {sel?.note ? <Txt style={styles.selNote}>{sel.note}</Txt> : null}
      </ActionsSheet>

      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={t.deleteTitle}
        text={sel?.deleteText ?? ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ExpenseShell>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  monthFilter: { flex: 1, minWidth: 0 },
  catFilter: { flex: 1.2, minWidth: 0 },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Red[50],
    borderWidth: 1,
    borderColor: Red[200],
  },
  totalText: { flex: 1, minWidth: 0 },
  scope: { fontSize: 13, color: Red[900] },
  total: { fontSize: 20, fontWeight: '700', color: Red[700] },
  clear: { height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: Red[200], backgroundColor: White, justifyContent: 'center' },
  clearText: { fontSize: 13, fontWeight: '600', color: Red[800] },
  count: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  empty: { paddingVertical: 32, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  groupList: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  older: { height: 48 },
  source: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Zinc[100] },
  sourceText: { flex: 1, fontSize: 14, color: Zinc[700] },
  selNote: { fontSize: 14, color: Zinc[700] },
});
