import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BalanceShell } from '@/features/balance/BalanceShell';
import { BALANCE_COPY } from '@/features/balance/copy';
import { TransferFormSheet, type Transfer } from '@/features/balance/TransferFormSheet';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { inRange, listRange, type ListPeriod } from '@/lib/periods';
import { printTable } from '@/lib/print';
import { deleteTransfer, useBalance, useBalanceWrite } from '@/services/balance.services';
import { toBusinessInfo, useBusinessSettings } from '@/services/business.services';

const PAGE = 50;
const PERIODS: ListPeriod[] = ['all', 'thisMonth', 'lastMonth', 'thisYear'];

/** Money moved between accounts: the list by day, and new / edit / delete. */
export default function TransfersScreen() {
  const t = useCopy(BALANCE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useBalanceWrite();
  const { data } = useBalance();
  const business = toBusinessInfo(useBusinessSettings().data);

  const [period, setPeriod] = useState<ListPeriod>('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [selected, setSelected] = useState<Transfer | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = listRange(period);
  const all = ((data?.sources.transfers ?? []) as Transfer[])
    .filter((x) => inRange(x.date, range))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String((b as any).created_at ?? '').localeCompare(String((a as any).created_at ?? '')));
  const shown = all.slice(0, limit);
  const total = all.reduce((s, x) => s + Number(x.amount || 0), 0);

  const groups: { label: string; items: Transfer[] }[] = [];
  for (const item of shown) {
    const label = dateLabel(item.date, lang);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteTransfer(selected.id));
      setSheet(null);
      setSelected(null);
      toast.show(t.transferDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const print = () =>
    printTable({
      heading: business.name,
      title: t.transferList,
      subtitle: t.listPeriods[period],
      columns: [{ label: '#' }, { label: t.date }, { label: t.fromAccount.replace(' *', '') }, { label: t.toAccount.replace(' *', '') }, { label: t.amount.replace(' *', ''), align: 'right' }, { label: t.notes }],
      rows: all.map((x, i) => [i + 1, dateLabel(x.date, lang), x.from_account_name, x.to_account_name, money(x.amount), x.notes || '']),
      footer: [[t.totalTransfer, money(total)]],
    }).catch(() => {});

  const count = lang === 'bn' ? bnDigits(all.length) : String(all.length);

  return (
    <BalanceShell section="transfers" right={<HeaderIconButton icon="printer" label={t.printTransfers} onPress={print} />} fab={{ label: t.newTransfer, onPress: openNew }}>
      <View style={styles.tiles}>
        <StatTile label={t.totalTransfer} value={money(total)} />
        <StatTile label={t.totalTransactions} value={count} />
      </View>

      <View style={styles.note}>
        <DesignIcon name="info" size={18} color={Zinc[500]} />
        <Txt style={styles.noteText}>{t.transferNote}</Txt>
      </View>

      <View style={styles.listHead}>
        <Txt accessibilityRole="header" style={styles.listTitle}>
          {t.transferList}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t.choosePeriod}: ${t.listPeriods[period]}`} onPress={() => setPeriodOpen(true)} style={styles.periodButton}>
          <Txt style={styles.periodText}>{t.listPeriods[period]}</Txt>
          <DesignIcon name="chevronDown" size={16} color={Zinc[900]} strokeWidth={2} />
        </Pressable>
      </View>

      {groups.length === 0 ? <Txt style={styles.empty}>{t.noTransfers}</Txt> : null}

      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Txt style={styles.groupLabel}>{group.label}</Txt>
          <View style={styles.list}>
            {group.items.map((item, i) => (
              <View key={item.id} style={[styles.item, i > 0 && styles.divider]}>
                <View style={styles.route}>
                  <View style={styles.leg}>
                    <View style={styles.fromDot} />
                    <Txt style={[styles.account, { color: Red[700] }]}>{item.from_account_name}</Txt>
                  </View>
                  <View style={styles.leg}>
                    <DesignIcon name="cornerDownRight" size={16} color={Green[700]} strokeWidth={2} />
                    <Txt style={[styles.account, { color: Green[700] }]}>{item.to_account_name}</Txt>
                  </View>
                  {item.notes ? <Txt style={styles.itemNote}>{item.notes}</Txt> : null}
                </View>
                <Txt style={styles.amount}>{money(item.amount)}</Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.transferOptions(money(item.amount), item.from_account_name, item.to_account_name)}
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
        </View>
      ))}

      {all.length > 0 ? (
        <Pressable disabled={shown.length >= all.length} onPress={() => setLimit((n) => n + PAGE)}>
          <Txt style={styles.showing}>{shown.length < all.length ? t.showingLatest(shown.length, all.length) : t.showingAll(all.length)}</Txt>
        </Pressable>
      ) : null}

      <ChoiceSheet
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        title={t.choosePeriod}
        closeLabel={t.close}
        options={PERIODS.map((p) => ({ key: p, label: t.listPeriods[p] }))}
        selected={period}
        onSelect={(p) => {
          setPeriod(p);
          setLimit(PAGE);
        }}
      />

      <TransferFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} accounts={data?.accounts ?? []} />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? money(selected.amount) : ''}
        subtitle={selected ? `${selected.from_account_name} → ${selected.to_account_name} · ${dateLabel(selected.date, lang)}` : ''}
        editLabel={t.editTransfer}
        deleteLabel={t.deleteTransfer}
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
        title={t.deleteTransferTitle}
        text={selected ? t.deleteTransferText(money(selected.amount), selected.from_account_name, selected.to_account_name, dateLabel(selected.date, lang)) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </BalanceShell>
  );
}


const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: Zinc[200] },
  noteText: { flex: 1, fontSize: 13, color: Zinc[700] },
  listHead: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  listTitle: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  periodButton: { height: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White, flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodText: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
  empty: { paddingVertical: 24, fontSize: 14, color: Zinc[600], textAlign: 'center' },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 14, paddingRight: 4 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  route: { flex: 1, minWidth: 0, gap: 4 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fromDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: Red[600], marginHorizontal: 4 },
  account: { flexShrink: 1, fontSize: 14, fontWeight: '600' },
  itemNote: { paddingLeft: 24, fontSize: 13, color: Zinc[500] },
  amount: { flexShrink: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  showing: { fontSize: 13, color: Zinc[500], textAlign: 'center' },
});
