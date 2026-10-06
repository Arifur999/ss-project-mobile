import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { FilterChips } from '@/components/FilterChips';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { BalanceShell } from '@/features/balance/BalanceShell';
import { BALANCE_COPY } from '@/features/balance/copy';
import { buildAccountLedger, type AccountLedgerRow } from '@/lib/accountLedger';
import { dateLabel } from '@/lib/dates';
import { listRange, type ListPeriod } from '@/lib/periods';
import { printTable } from '@/lib/print';
import { useBalance } from '@/services/balance.services';
import { toBusinessInfo, useBusinessSettings } from '@/services/business.services';

const PERIODS: ListPeriod[] = ['all', 'thisMonth', 'lastMonth', 'thisYear'];

/** One account read like a passbook: every movement, the balance after each. */
export default function LedgerScreen() {
  const t = useCopy(BALANCE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const { data } = useBalance();
  const business = toBusinessInfo(useBusinessSettings().data);
  const params = useLocalSearchParams<{ account?: string }>();
  const [accountId, setAccountId] = useState(params.account ?? '');
  const [period, setPeriod] = useState<ListPeriod>('all');

  const account = data?.accounts.find((a) => a.id === accountId) ?? null;
  const range = listRange(period);
  const ledger = account && data ? buildAccountLedger({ account, sources: data.sources, from: range?.from, to: range?.to }) : null;

  // Transfers read the way the design writes them; everything else names its
  // source document and what it was for.
  const describe = (row: AccountLedgerRow) => {
    if (row.kind === 'Transfer in') return t.transferFrom(row.reference);
    if (row.kind === 'Transfer out') return t.transferTo(row.reference);
    return [row.reference, row.description].filter(Boolean).join(' · ');
  };
  const kind = (row: AccountLedgerRow) => t.kinds[row.kind] ?? row.kind;

  const print = () => {
    if (!ledger || !account) return;
    printTable({
      heading: business.name,
      title: account.name,
      subtitle: t.listPeriods[period],
      columns: [{ label: '#' }, { label: t.date }, { label: t.account }, { label: '' }, { label: t.moneyIn, align: 'right' }, { label: t.moneyOut, align: 'right' }, { label: t.closing, align: 'right' }],
      rows: [
        ['', '', t.broughtForward, '', '', '', money(ledger.opening)],
        ...ledger.rows.map((row, i) => [
          i + 1,
          dateLabel(row.date, lang),
          kind(row),
          describe(row),
          row.direction === 'in' ? money(row.amount) : '',
          row.direction === 'out' ? money(row.amount) : '',
          money(row.balance),
        ]),
      ],
      footer: [
        [t.moneyIn, money(ledger.total_in)],
        [t.moneyOut, money(ledger.total_out)],
        [t.closing, money(ledger.closing)],
      ],
    }).catch(() => {});
  };

  return (
    <BalanceShell section="ledger" right={<HeaderIconButton icon="printer" label={t.printLedger} onPress={print} disabled={!ledger} />}>
      <Txt style={styles.intro}>{t.ledgerIntro}</Txt>

      <View style={styles.controls}>
        <SelectField
          label={t.account}
          placeholder={t.selectAccount}
          value={accountId}
          options={(data?.accounts ?? []).map((a) => ({ key: a.id, label: a.name }))}
          onChange={setAccountId}
          closeLabel={t.close}
        />
        <FilterChips label={t.period} options={PERIODS.map((p) => ({ key: p, label: t.listPeriods[p] }))} selected={period} onSelect={setPeriod} />
      </View>

      {!ledger ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <DesignIcon name="book" size={26} color={Zinc[600]} />
          </View>
          <Txt style={styles.emptyText}>{t.chooseLedger}</Txt>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Figure label={t.opening} value={money(ledger.opening)} />
              <Figure label={t.closing} value={money(ledger.closing)} color={ledger.closing < 0 ? Red[600] : Zinc[900]} />
            </View>
            <View style={styles.summaryRow}>
              <Figure label={t.moneyIn} value={money(ledger.total_in)} color={Green[700]} />
              <Figure label={t.moneyOut} value={money(ledger.total_out)} color={Red[600]} />
            </View>
          </View>

          <View style={styles.list}>
            <View style={styles.forward}>
              <Txt style={styles.forwardLabel}>{t.broughtForward}</Txt>
              <Txt style={styles.forwardValue}>{money(ledger.opening)}</Txt>
            </View>
            {ledger.rows.map((row, i) => {
              const incoming = row.direction === 'in';
              return (
                <View key={`${row.kind}-${row.date}-${i}`} style={styles.entry}>
                  <View style={styles.entryLeft}>
                    <Txt style={styles.entryDate}>{dateLabel(row.date, lang)}</Txt>
                    <View style={styles.chipRow}>
                      <View style={[styles.chip, { backgroundColor: incoming ? Green[100] : Red[100] }]}>
                        <Txt style={[styles.chipText, { color: incoming ? Green[800] : Red[800] }]}>{kind(row)}</Txt>
                      </View>
                    </View>
                    {describe(row) ? <Txt style={styles.entryDesc}>{describe(row)}</Txt> : null}
                  </View>
                  <View style={styles.entryRight}>
                    <Txt style={[styles.entryAmount, { color: incoming ? Green[700] : Red[600] }]}>
                      {(incoming ? '+' : '−') + money(row.amount)}
                    </Txt>
                    <Txt style={styles.entryBal}>{t.bal(money(row.balance))}</Txt>
                  </View>
                </View>
              );
            })}
            {ledger.rows.length === 0 ? <Txt style={styles.noEntries}>{t.noMovements}</Txt> : null}
          </View>
        </>
      )}
    </BalanceShell>
  );
}

function Figure({ label, value, color = Zinc[900] }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.figure}>
      <Txt style={styles.figureLabel}>{label}</Txt>
      <Txt style={[styles.figureValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  controls: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  empty: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Zinc[300],
  },
  emptyBadge: { width: 56, height: 56, borderRadius: 999, backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: Zinc[600], textAlign: 'center' },
  summary: { gap: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  figure: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: Zinc[200] },
  figureLabel: { fontSize: 12, color: Zinc[500] },
  figureValue: { fontSize: 17, fontWeight: '600' },
  list: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  forward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Zinc[100] },
  forwardLabel: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  forwardValue: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Zinc[100] },
  entryLeft: { flex: 1, minWidth: 0, gap: 2 },
  entryDate: { fontSize: 12, color: Zinc[500] },
  chipRow: { flexDirection: 'row' },
  chip: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  entryDesc: { fontSize: 14, color: Zinc[700] },
  entryRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  entryAmount: { fontSize: 15, fontWeight: '600' },
  entryBal: { fontSize: 12, color: Zinc[500] },
  noEntries: { paddingVertical: 20, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: Zinc[100], fontSize: 14, color: Zinc[600], textAlign: 'center' },
});
