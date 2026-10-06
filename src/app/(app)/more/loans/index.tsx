import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { FigureCard } from '@/components/FigureCard';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Amber, Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BalanceSmsSheet } from '@/features/loans/BalanceSmsSheet';
import { LOAN_COPY } from '@/features/loans/copy';
import { LoanShell } from '@/features/loans/LoanShell';
import { OutstandingCard, summaryPhone, type LoanSummary } from '@/features/loans/OutstandingCard';
import { SIDE_LOOK, sideOf } from '@/features/loans/side';
import { buildLoanSummary } from '@/lib/loans';
import { useLoanData } from '@/services/loans.services';

type Sort = 'high' | 'low' | 'name';

const sum = (rows: LoanSummary[], pick: (r: LoanSummary) => number) => rows.reduce((s, r) => s + pick(r), 0);

/** Where every bank and person stands, with the totals - Hatim's LoanDashboard. */
export default function LoanOverviewScreen() {
  const t = useCopy(LOAN_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const { data } = useLoanData();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('high');
  const [sms, setSms] = useState<{ targets: LoanSummary[]; all: boolean } | null>(null);

  const summaries = useMemo(
    () => buildLoanSummary(data?.lenders ?? [], data?.loans ?? []) as LoanSummary[],
    [data?.lenders, data?.loans],
  );

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = summaries.filter(
      (item) => !q || String(item.name || '').toLowerCase().includes(q) || summaryPhone(item).toLowerCase().includes(q),
    );
    return rows.sort((a, b) =>
      sort === 'name' ? String(a.name || '').localeCompare(String(b.name || '')) : sort === 'low' ? a.balance - b.balance : b.balance - a.balance,
    );
  }, [summaries, query, sort]);

  // The figures above the list are the whole book; the total under it follows the search.
  const totalDena = sum(summaries.filter((s) => s.balance < 0), (s) => Math.abs(s.balance));
  const totalPawna = sum(summaries.filter((s) => s.balance > 0), (s) => s.balance);
  const outstanding = sum(summaries, (s) => s.balance);
  const activeAccounts = summaries.filter((s) => s.balance !== 0).length;
  const netSide = sideOf(outstanding);

  const shown = {
    opening: sum(displayed, (s) => s.opening),
    received: sum(displayed, (s) => s.received),
    paid: sum(displayed, (s) => s.paid),
    profit: sum(displayed, (s) => s.profit || 0),
    balance: sum(displayed, (s) => s.balance),
  };
  const shownSide = sideOf(shown.balance);

  const smsOne = (item: LoanSummary) => {
    if (!summaryPhone(item)) return toast.show(t.noPhone(item.name));
    setSms({ targets: [item], all: false });
  };
  const smsAll = () => {
    const targets = displayed.filter((item) => summaryPhone(item));
    if (targets.length === 0) return toast.show(t.noPhones);
    setSms({ targets, all: true });
  };
  const openStatement = (item: LoanSummary) =>
    router.replace(item.lender?.id ? { pathname: '/more/loans/statement', params: { lender: item.lender.id } } : '/more/loans/statement');

  const outline = { bg: White, ink: Zinc[700], outlined: true };

  return (
    <LoanShell section="overview">
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <FigureCard
            label={t.totalDena}
            value={money(totalDena)}
            caption={t.youOweThem}
            badge={{ icon: 'arrowUpRight', bg: Red[100], ink: Red[700] }}
          />
          <FigureCard
            label={t.totalPawna}
            value={money(totalPawna)}
            caption={t.theyOweYou}
            badge={{ icon: 'arrowDownLeft', bg: Green[100], ink: Green[800] }}
          />
        </View>
        <View style={styles.gridRow}>
          <FigureCard label={t.totalPaid} value={money(sum(summaries, (s) => s.paid))} caption={t.paymentMade} badge={{ icon: 'upload', ...outline }} />
          <FigureCard
            label={t.totalReceived}
            value={money(sum(summaries, (s) => s.received))}
            caption={t.cashReceived}
            badge={{ icon: 'download', ...outline }}
          />
        </View>
        <View style={styles.gridRow}>
          <FigureCard
            dark
            label={t.netBalance}
            value={money(Math.abs(outstanding))}
            caption={t.netSide[netSide]}
            captionColor={SIDE_LOOK[netSide].onDark}
            badge={{ icon: 'activity', bg: 'rgba(255, 255, 255, 0.12)', ink: White }}
          />
          <FigureCard label={t.activeAccounts} value={String(activeAccounts)} caption={t.totalActive} badge={{ icon: 'users', ...outline }} />
        </View>
      </View>

      <View style={styles.listHead}>
        <Txt accessibilityRole="header" style={styles.listTitle}>
          {t.outstandingTitle}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: displayed.length === 0 }}
          disabled={displayed.length === 0}
          onPress={smsAll}
          style={[styles.smsAll, displayed.length === 0 && styles.disabled]}>
          <DesignIcon name="message" size={16} color={White} strokeWidth={2} />
          <Txt style={styles.smsAllText}>{t.sendSms}</Txt>
        </Pressable>
      </View>

      <View style={styles.tools}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t.searchPlaceholder} label={t.searchLabel} style={styles.grow} />
        <SelectPill
          shape="box"
          label={t.sortLabel}
          value={sort}
          onChange={setSort}
          closeLabel={t.close}
          options={(['high', 'low', 'name'] as const).map((key) => ({ key, label: t.sorts[key] }))}
          style={styles.sort}
        />
      </View>

      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{query.trim() ? t.noMatch(query.trim()) : t.noPeopleYet}</Txt>
        </View>
      ) : null}

      {displayed.map((item) => (
        <OutstandingCard key={item.key} item={item} onSms={() => smsOne(item)} onStatement={() => openStatement(item)} />
      ))}

      <View style={styles.total} accessibilityLabel={t.total}>
        <View style={styles.totalHead}>
          <Txt style={styles.totalTitle}>{t.total}</Txt>
          <View style={styles.totalFigure}>
            <Txt style={styles.totalAmount}>{money(Math.abs(shown.balance))}</Txt>
            <Txt style={[styles.totalSide, { color: SIDE_LOOK[shownSide].onDark }]}>{t.side[shownSide]}</Txt>
          </View>
        </View>
        <View style={styles.totalFigures}>
          {[
            { label: t.opening, value: shown.opening, color: White },
            { label: t.receive, value: shown.received, color: Green[300] },
            { label: t.payment, value: shown.paid, color: Red[300] },
            { label: t.profit, value: shown.profit, color: Amber[300] },
          ].map((f) => (
            <View key={f.label} style={styles.totalCell}>
              <Txt style={styles.totalLabel}>{f.label}</Txt>
              <Txt style={[styles.totalValue, { color: f.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {money(f.value)}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Green[600] }]} />
          <Txt style={styles.legendText}>
            <Txt style={styles.legendStrong}>{t.side.pawna}</Txt> {t.legendPawna}
          </Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Red[600] }]} />
          <Txt style={styles.legendText}>
            <Txt style={styles.legendStrong}>{t.side.dena}</Txt> {t.legendDena}
          </Txt>
        </View>
      </View>

      <BalanceSmsSheet targets={sms?.targets ?? null} all={!!sms?.all} onClose={() => setSms(null)} />
    </LoanShell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  listTitle: { flex: 1, fontSize: 17, fontWeight: '600', lineHeight: 23, color: Zinc[900] },
  smsAll: {
    flexShrink: 0,
    height: 40,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: Zinc[900],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabled: { opacity: 0.5 },
  smsAllText: { fontSize: 13, fontWeight: '600', color: White },
  tools: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  sort: { width: 132, flexShrink: 0 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  total: { gap: 12, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 18, backgroundColor: Zinc[950] },
  totalHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  totalTitle: { fontSize: 15, fontWeight: '600', color: White },
  totalFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totalAmount: { fontSize: 19, fontWeight: '600', color: White },
  totalSide: { fontSize: 12, fontWeight: '600' },
  totalFigures: { flexDirection: 'row', gap: 6 },
  totalCell: { flex: 1, minWidth: 0 },
  totalLabel: { fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' },
  totalValue: { fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  legendText: { fontSize: 13, color: Zinc[700] },
  legendStrong: { fontSize: 13, fontWeight: '600', color: Zinc[700] },
});
