import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BALANCE_COPY } from '@/features/balance/copy';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { InvestFormSheet } from '@/features/shareholders/InvestFormSheet';
import { ShareholderShell } from '@/features/shareholders/ShareholderShell';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { inRange, listRange, type ListPeriod } from '@/lib/periods';
import { printTable } from '@/lib/print';
import { deleteInvestment, useShareholderData, useShareholderWrite } from '@/services/shareholders.services';

type Row = Record<string, any>;
const PERIODS: ListPeriod[] = ['all', 'thisMonth', 'lastMonth', 'thisYear'];

/** Shareholder capital in and out: totals, the entries by day, add / edit / delete. */
export default function ShareholderInvestScreen() {
  const t = useCopy(SHAREHOLDER_COPY);
  const periodsCopy = useCopy(BALANCE_COPY).listPeriods;
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useShareholderWrite();
  const { data } = useShareholderData();

  const [period, setPeriod] = useState<ListPeriod>('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = listRange(period);
  const list = (data?.investments ?? [])
    .filter((r) => inRange(r.date, range))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  const isIn = (r: Row) => Number(r.invest_amount || 0) > 0;
  const amountOf = (r: Row) => (isIn(r) ? Number(r.invest_amount || 0) : Number(r.withdraw_amount || 0));
  const invested = list.reduce((s, r) => s + Number(r.invest_amount || 0), 0);
  const withdrawn = list.reduce((s, r) => s + Number(r.withdraw_amount || 0), 0);
  const net = invested - withdrawn;
  const typeLabel = (r: Row) => (isIn(r) ? t.investment : t.withdrawal);

  const groups: { label: string; items: Row[] }[] = [];
  for (const item of list) {
    const label = dateLabel(item.date, lang);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteInvestment(String(selected.id)));
      setSheet(null);
      toast.show(t.entryDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const print = () =>
    printTable({
      title: t.transactions,
      subtitle: periodsCopy[period],
      columns: [{ label: '#' }, { label: t.date }, { label: t.shareholder.replace(' *', '') }, { label: t.entryType }, { label: t.account.replace(' *', '') }, { label: t.amount.replace(' *', ''), align: 'right' }],
      rows: list.map((r, i) => [i + 1, dateLabel(r.date, lang), r.shareholder_name, typeLabel(r), r.account_name ?? '', money(amountOf(r))]),
      footer: [
        [t.totalInvestment, money(invested)],
        [t.totalWithdrawal, money(withdrawn)],
        [t.netInvestment, money(net)],
      ],
    }).catch(() => {});

  return (
    <ShareholderShell
      section="invest"
      right={<HeaderIconButton icon="printer" label={t.printTransactions} onPress={print} />}
      fab={{
        label: t.newEntry,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <Txt style={styles.intro}>{t.investIntro}</Txt>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <View style={styles.tile}>
            <Txt style={styles.tileLabel}>{t.totalInvestment}</Txt>
            <Txt style={[styles.tileValue, { color: Green[700] }]} numberOfLines={1} adjustsFontSizeToFit>
              {money(invested)}
            </Txt>
          </View>
          <View style={styles.tile}>
            <Txt style={styles.tileLabel}>{t.totalWithdrawal}</Txt>
            <Txt style={[styles.tileValue, { color: Red[600] }]} numberOfLines={1} adjustsFontSizeToFit>
              {money(withdrawn)}
            </Txt>
          </View>
        </View>
        <View style={styles.netCard}>
          <Txt style={styles.netLabel}>{t.netInvestment}</Txt>
          <Txt style={[styles.netValue, { color: net < 0 ? Red[400] : White }]}>{money(net)}</Txt>
        </View>
      </View>

      <View style={styles.listHead}>
        <Txt accessibilityRole="header" style={styles.listTitle}>
          {t.transactions}
        </Txt>
        <Pressable accessibilityRole="button" onPress={() => setPeriodOpen(true)} style={styles.periodButton}>
          <Txt style={styles.periodText}>{periodsCopy[period]}</Txt>
          <DesignIcon name="chevronDown" size={16} color={Zinc[900]} strokeWidth={2} />
        </Pressable>
      </View>

      {list.length === 0 ? <Txt style={styles.empty}>{t.noTransactions}</Txt> : null}

      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Txt style={styles.groupLabel}>{group.label}</Txt>
          <View style={styles.list}>
            {group.items.map((item, i) => {
              const incoming = isIn(item);
              return (
                <View key={item.id} style={[styles.item, i > 0 && styles.divider]}>
                  <Initial name={String(item.shareholder_name || '')} size={40} tone="muted" />
                  <View style={styles.body}>
                    <Txt style={styles.name}>{item.shareholder_name}</Txt>
                    <View style={styles.metaRow}>
                      <View style={[styles.chip, { backgroundColor: incoming ? Green[100] : Red[100] }]}>
                        <Txt style={[styles.chipText, { color: incoming ? Green[800] : Red[800] }]}>{typeLabel(item)}</Txt>
                      </View>
                      <Txt style={styles.meta}>{item.account_name}</Txt>
                    </View>
                    {item.notes ? <Txt style={styles.note}>{item.notes}</Txt> : null}
                  </View>
                  <Txt style={[styles.amount, { color: incoming ? Green[700] : Red[600] }]}>
                    {(incoming ? '+' : '−') + money(amountOf(item))}
                  </Txt>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.entryOptions(String(item.shareholder_name), typeLabel(item))}
                    onPress={() => {
                      setSelected(item);
                      setSheet('actions');
                    }}
                    style={styles.more}>
                    <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <ChoiceSheet
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        title={useCopy(BALANCE_COPY).choosePeriod}
        closeLabel={t.close}
        options={PERIODS.map((p) => ({ key: p, label: periodsCopy[p] }))}
        selected={period}
        onSelect={setPeriod}
      />

      <InvestFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        shareholders={data?.shareholders ?? []}
        accounts={data?.accounts ?? []}
      />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? t.entryTitle(typeLabel(selected), money(amountOf(selected))) : ''}
        subtitle={selected ? `${selected.shareholder_name} · ${selected.account_name ?? ''} · ${dateLabel(selected.date, lang)}` : ''}
        editLabel={t.editEntry}
        deleteLabel={t.deleteEntry}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        onEdit={() => {
          setSheet(null);
          setEditing(selected);
          setFormOpen(true);
        }}
        onDelete={() => setSheet('confirm')}
      />

      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={t.deleteEntryTitle}
        text={selected ? t.deleteInvestText(typeLabel(selected), money(amountOf(selected)), String(selected.shareholder_name), dateLabel(selected.date, lang), String(selected.account_name ?? '')) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ShareholderShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  totals: { gap: 12 },
  totalRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  tileLabel: { fontSize: 13, fontWeight: '500', color: Zinc[600] },
  tileValue: { fontSize: 19, fontWeight: '600' },
  netCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Zinc[950] },
  netLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(255, 255, 255, 0.75)' },
  netValue: { fontSize: 20, fontWeight: '600' },
  listHead: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  listTitle: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  periodButton: { height: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White, flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodText: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
  empty: { paddingVertical: 32, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300], fontSize: 14, color: Zinc[600], textAlign: 'center' },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 4 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  meta: { fontSize: 13, color: Zinc[600] },
  note: { fontSize: 13, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600' },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
