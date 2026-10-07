import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FilterChips } from '@/components/FilterChips';
import { PromptCard } from '@/components/PromptCard';
import { SelectField } from '@/components/SelectField';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { LoanShell } from '@/features/loans/LoanShell';
import { statementFigures } from '@/features/loans/statement';
import { StatementLedger, useBalanceText } from '@/features/loans/StatementLedger';
import { StatementSummary } from '@/features/loans/StatementSummary';
import { dateLabel, monthName, todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { smsBusiness } from '@/lib/smsTexts';
import { listRange } from '@/lib/periods';
import { printTable, shareTablePdf, type PrintableTable } from '@/lib/print';
import { useBusinessSettings } from '@/services/business.services';
import { useLenderStatement, useLoanData } from '@/services/loans.services';

type Period = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

/** One bank or person's passbook over a period - Hatim's LoanLedger. */
export default function LoanStatementScreen() {
  const t = useCopy(LOAN_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const balText = useBalanceText();
  const business = useBusinessSettings();
  const { data } = useLoanData();
  const params = useLocalSearchParams<{ lender?: string }>();

  const [lenderId, setLenderId] = useState(params.lender ?? '');
  const [seededFrom, setSeededFrom] = useState(params.lender ?? '');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(todayISO());
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);

  // Opened again from a card or the bank / person menu: show that one.
  if ((params.lender ?? '') !== seededFrom) {
    setSeededFrom(params.lender ?? '');
    if (params.lender) setLenderId(params.lender);
  }

  const lender = (data?.lenders ?? []).find((l) => l.id === lenderId) ?? null;
  const custom = period === 'custom';
  const rangeError = custom && from && to && from > to ? t.rangeError : '';
  const range = custom ? { from, to } : period === 'all' ? null : listRange(period);
  const statement = useLenderStatement(lender && !rangeError ? lender.id : null, range?.from, range?.to);

  const num = (n: number) => (lang === 'bn' ? bnDigits(n) : String(n));
  const now = new Date();
  const periodText =
    period === 'thisMonth'
      ? `${monthName(now.getMonth() + 1, lang)} ${num(now.getFullYear())}`
      : period === 'lastMonth'
        ? (() => {
            const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return `${monthName(last.getMonth() + 1, lang)} ${num(last.getFullYear())}`;
          })()
        : period === 'thisYear'
          ? num(now.getFullYear())
          : custom
            ? `${from ? dateLabel(from, lang) : t.start} – ${to ? dateLabel(to, lang) : t.today}`
            : t.allTime;

  const phone = String(lender?.phone || '').trim();
  const sub = [phone, periodText].filter(Boolean).join(' · ');

  const printable = (): PrintableTable | null => {
    const s = statement.data;
    if (!s || !lender) return null;
    const figures = statementFigures(s);
    return {
      heading: smsBusiness(business.data).businessName,
      title: t.statementTitle(lender.name),
      subtitle: sub,
      columns: [
        { label: t.colDate },
        { label: t.colType },
        { label: t.colAccount },
        { label: t.colDebit, align: 'right' },
        { label: t.colCredit, align: 'right' },
        { label: t.colBalance, align: 'right' },
      ],
      rows: [
        ['', t.openingBalance, '', '', '', balText(figures.opening)],
        ...s.rows.map((entry) => [
          dateLabel(String(entry.row.date || ''), lang),
          `${Number(entry.credit || 0) > 0 ? t.received : t.paid}${entry.is_profit ? ` · ${t.profit}` : ''}`,
          String(entry.row.account_name || ''),
          entry.debit ? money(entry.debit) : '',
          entry.credit ? money(entry.credit) : '',
          entry.is_profit ? t.balanceUnchanged : balText(Number(entry.running_principal || 0)),
        ]),
      ],
      footer: [
        [t.paidDebit, money(figures.paid)],
        [t.receivedCredit, money(figures.received)],
        [t.closingBalance, balText(figures.closing)],
      ],
    };
  };

  const output = async (kind: 'share' | 'print') => {
    const table = printable();
    if (!table || busy) return;
    setBusy(kind);
    try {
      if (kind === 'share') await shareTablePdf(table, t.statementTitle(lender?.name ?? ''));
      else await printTable(table);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <LoanShell section="statement">
      <Txt style={styles.intro}>{t.statementIntro}</Txt>

      <View style={styles.controls}>
        <SelectField
          label={t.personLabel}
          placeholder={t.choosePerson}
          closeLabel={t.close}
          value={lenderId}
          options={(data?.lenders ?? []).map((l) => ({ key: l.id, label: l.name }))}
          onChange={setLenderId}
        />
        <FilterChips
          label={t.periodLabel}
          selected={period}
          onSelect={setPeriod}
          options={(['all', 'thisMonth', 'lastMonth', 'thisYear', 'custom'] as const).map((key) => ({ key, label: t.periods[key] }))}
        />
        {custom ? (
          <>
            <View style={styles.pair}>
              <View style={styles.grow}>
                <DateField label={t.from} labelStyle={styles.smallLabel} value={from} onChange={setFrom} />
              </View>
              <View style={styles.grow}>
                <DateField label={t.to} labelStyle={styles.smallLabel} value={to} onChange={setTo} />
              </View>
            </View>
            {rangeError ? <Txt style={styles.rangeError}>{rangeError}</Txt> : null}
          </>
        ) : null}
      </View>

      {!lender ? (
        <PromptCard icon="fileText" text={t.noPersonText} />
      ) : rangeError ? null : statement.isPending ? (
        <View style={styles.state}>
          <Spinner color={Zinc[900]} size={24} />
        </View>
      ) : statement.isError || !statement.data ? (
        <View style={styles.state}>
          <AlertBanner tone="error">{errorMessage(statement.error)}</AlertBanner>
          <Button title={t.retry} variant="pillOutline" onPress={() => statement.refetch()} />
        </View>
      ) : (
        <View style={styles.statement}>
          <StatementSummary name={lender.name} sub={sub} figures={statementFigures(statement.data)} />
          <StatementLedger statement={statement.data} />
          <View style={styles.pair}>
            <Button title={t.sharePdf} icon="share" variant="pill" busy={busy === 'share'} onPress={() => output('share')} style={styles.grow} />
            <Button title={t.print} icon="printer" variant="pillOutline" busy={busy === 'print'} onPress={() => output('print')} style={styles.grow} />
          </View>
        </View>
      )}
    </LoanShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  controls: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  pair: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  smallLabel: { fontSize: 13, color: Zinc[700] },
  rangeError: { fontSize: 14, color: Red[700] },
  state: { minHeight: 200, justifyContent: 'center', gap: 12 },
  statement: { gap: 12 },
});
