import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Fab } from '@/components/SectionShell';
import { Txt } from '@/components/Txt';
import { Blue, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BALANCE_COPY } from '@/features/balance/copy';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { ProfitFormSheet } from '@/features/shareholders/ProfitFormSheet';
import { ShareholderShell } from '@/features/shareholders/ShareholderShell';
import { dateLabel, monthYearLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { inRange, listRange, type ListPeriod } from '@/lib/periods';
import { deleteProfitWithdrawal, useShareholderData, useShareholderWrite } from '@/services/shareholders.services';

type Row = Record<string, any>;
const PERIODS: ListPeriod[] = ['all', 'thisMonth', 'lastMonth', 'thisYear'];

/** Profit taken out by the owners: the list, and add / edit / delete. */
export default function ProfitWithdrawScreen() {
  const t = useCopy(SHAREHOLDER_COPY);
  const balanceCopy = useCopy(BALANCE_COPY);
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
  const list = (data?.profitWithdrawals ?? [])
    .filter((r) => inRange(r.date, range))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  const total = list.reduce((s, r) => s + Number(r.amount || 0), 0);

  // "Profit for Oct 2026", or a span when the withdrawal covers several months.
  const periodOf = (r: Row) => {
    const date = String(r.date || '');
    const fm = Number(r.profit_month || date.slice(5, 7));
    const fy = Number(r.profit_year || date.slice(0, 4));
    const from = monthYearLabel(fy, fm, lang);
    const to = monthYearLabel(Number(r.to_year || fy), Number(r.to_month || fm), lang);
    return t.profitFor(from === to ? from : `${from} – ${to}`);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteProfitWithdrawal(String(selected.id)));
      setSheet(null);
      toast.show(t.entryDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ShareholderShell section="profit" fab={list.length > 0 ? { label: t.newEntry, onPress: openNew } : null}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Txt accessibilityRole="header" style={styles.title}>
            {t.profitTitle}
          </Txt>
          <Txt style={styles.summary}>{list.length === 0 ? t.noRecords : t.withdrawalsSummary(list.length, money(total))}</Txt>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setPeriodOpen(true)} style={styles.periodButton}>
          <Txt style={styles.periodText}>{balanceCopy.listPeriods[period]}</Txt>
          <DesignIcon name="chevronDown" size={16} color={Zinc[900]} strokeWidth={2} />
        </Pressable>
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <DesignIcon name="trendingUp" size={28} color={Blue[700]} />
          </View>
          <Txt style={styles.emptyTitle}>{t.noProfitTitle}</Txt>
          <Txt style={styles.emptyBody}>{t.noProfitBody}</Txt>
          <Fab label={t.newEntry} onPress={openNew} floating={false} />
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((item, i) => (
            <View key={item.id} style={[styles.item, i > 0 && styles.divider]}>
              <View style={styles.avatar}>
                <Txt style={styles.avatarText}>{(String(item.shareholder_name || '').trim().charAt(0) || '?').toUpperCase()}</Txt>
              </View>
              <View style={styles.body}>
                <Txt style={styles.owner}>{item.shareholder_name}</Txt>
                <Txt style={styles.period}>{periodOf(item)}</Txt>
                <Txt style={styles.meta}>{`${dateLabel(item.date, lang)} · ${item.account_name ?? ''}`}</Txt>
                {item.notes ? <Txt style={styles.note}>{item.notes}</Txt> : null}
              </View>
              <Txt style={styles.amount}>{money(item.amount)}</Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.profitOptions(String(item.shareholder_name))}
                onPress={() => {
                  setSelected(item);
                  setSheet('actions');
                }}
                style={styles.more}>
                <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <ChoiceSheet
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        title={balanceCopy.choosePeriod}
        closeLabel={t.close}
        options={PERIODS.map((p) => ({ key: p, label: balanceCopy.listPeriods[p] }))}
        selected={period}
        onSelect={setPeriod}
      />

      <ProfitFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        shareholders={data?.shareholders ?? []}
        accounts={data?.accounts ?? []}
      />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? `${money(selected.amount)} · ${selected.shareholder_name}` : ''}
        subtitle={selected ? `${periodOf(selected)} · ${selected.account_name ?? ''}` : ''}
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
        text={selected ? t.deleteProfitText(money(selected.amount), String(selected.shareholder_name), dateLabel(selected.date, lang), String(selected.account_name ?? '')) : ''}
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headText: { flexShrink: 1 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  summary: { fontSize: 13, color: Zinc[500] },
  periodButton: { height: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White, flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodText: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
  empty: { minHeight: 340, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyBadge: { width: 60, height: 60, borderRadius: 999, backgroundColor: Blue[50], alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Zinc[900], textAlign: 'center' },
  emptyBody: { maxWidth: 280, fontSize: 14, color: Zinc[600], textAlign: 'center' },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 4 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: Blue[50], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '700', color: Blue[700], lineHeight: 20 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  owner: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  period: { fontSize: 13, color: Zinc[600] },
  meta: { fontSize: 12, color: Zinc[500] },
  note: { fontSize: 13, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600', color: Blue[700] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
