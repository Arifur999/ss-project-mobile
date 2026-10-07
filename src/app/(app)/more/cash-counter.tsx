import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { ConfirmSheet } from '@/components/ItemSheets';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { TOOLS_COPY } from '@/features/tools/copy';
import { useCan } from '@/hooks/useCan';
import { cashRows, cashTotals, withCount, type CashDraft } from '@/lib/cashCount';
import { dateLabel, todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatMoney, formatNumber, parseAmount } from '@/lib/money';
import { printTable, shareTablePdf, type PrintableTable } from '@/lib/print';
import { emailReport } from '@/services/reports.services';

// Kept on the phone so a half-finished count survives the app being closed - nothing is sent anywhere until asked.
const STORAGE_KEY = 'cash_counter_v1';
const empty = (): CashDraft => ({ countedBy: '', date: todayISO(), counts: {} });

/**
 * Counting the drawer at day end - the website's Cash Counter: how many of
 * each note, what that comes to, who counted and when; then Share PDF, Print
 * or mail it to the owner. Figures go out unhidden: a count is for reading.
 */
export default function CashCounterScreen() {
  const t = useCopy(TOOLS_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const can = useCan();
  const [draft, setDraft] = useState<CashDraft>(empty);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'share' | 'print' | 'email' | null>(null);

  // A count left open overnight reopens dated today: the date is what it is filed under.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Partial<CashDraft>;
        setDraft({ countedBy: String(parsed.countedBy || ''), date: String(parsed.date || '') || todayISO(), counts: parsed.counts || {} });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<CashDraft>) =>
    setDraft((d) => {
      const next = { ...d, ...patch };
      // A full store must never stop somebody counting money.
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  const money = (n: unknown) => formatMoney(n, lang);
  const num = (n: unknown) => formatNumber(n, lang);
  const rows = cashRows(draft.counts);
  const totals = cashTotals(draft.counts);
  const period = t.countedLine(dateLabel(draft.date, lang), draft.countedBy.trim());

  const table = (): PrintableTable => ({
    title: t.cashTitle,
    subtitle: period,
    columns: [{ label: t.note }, { label: t.qty, align: 'right' }, { label: t.amount, align: 'right' }],
    rows: rows.map((r) => [money(r.value), num(r.qty), money(r.amount)]),
    footer: [
      [t.totalNotes, num(totals.notes)],
      [t.total, money(totals.amount)],
    ],
  });

  const run = async (kind: 'share' | 'print' | 'email') => {
    if (busy) return;
    if (totals.notes === 0) {
      toast.show(t.nothingToSend);
      return;
    }
    setBusy(kind);
    try {
      if (kind === 'share') await shareTablePdf(table(), t.cashTitle);
      else if (kind === 'print') await printTable(table());
      else {
        const result = await emailReport({
          title: t.cashTitle,
          period,
          summary: [
            { label: t.totalNotes, value: num(totals.notes) },
            { label: t.total, value: money(totals.amount) },
          ],
          tables: [{ title: t.cashTitle, columns: [t.note, t.qty, t.amount], rows: rows.map((r) => [money(r.value), num(r.qty), money(r.amount)]) }],
        });
        toast.show(t.sent(result.email));
      }
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.cashTitle} onBack={() => router.back()} backLabel={t.back} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Txt style={styles.intro}>{t.cashIntro}</Txt>
          <View style={styles.pair}>
            <View style={styles.grow}>
              <DateField label={t.date} value={draft.date} onChange={(date) => update({ date })} />
            </View>
            <View style={styles.grow}>
              <TextField tone="zinc" label={t.countedBy} placeholder={t.countedByPlaceholder} value={draft.countedBy} onChangeText={(countedBy) => update({ countedBy })} />
            </View>
          </View>

          <View style={styles.list}>
            {rows.map((row, i) => {
              const typed = draft.counts[row.value];
              return (
                <View key={row.value} style={[styles.row, i > 0 && styles.divider]}>
                  <Txt style={styles.note}>{money(row.value)}</Txt>
                  <Txt style={styles.times}>×</Txt>
                  <View style={styles.qty}>
                    <TextField
                      tone="zinc"
                      // The row already says which note; the box needs its name only for a screen reader.
                      label=""
                      accessibilityLabel={`${t.qty} ${money(row.value)}`}
                      placeholder="0"
                      value={typed === undefined ? '' : String(typed)}
                      onChangeText={(text) => {
                        const n = parseAmount(text);
                        update({ counts: withCount(draft.counts, row.value, text.trim() === '' ? null : Number.isFinite(n) ? n : 0) });
                      }}
                      keyboardType="number-pad"
                      inputStyle={styles.figure}
                    />
                  </View>
                  <Txt style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
                    {money(row.amount)}
                  </Txt>
                </View>
              );
            })}
          </View>

          <TotalsList rows={[{ label: t.totalNotes, value: num(totals.notes) }]} grand={{ label: t.total, value: money(totals.amount) }} />

          <View style={styles.pair}>
            <Button title={t.sharePdf} icon="share" variant="pill" busy={busy === 'share'} onPress={() => run('share')} style={styles.grow} />
            <Button title={t.print} icon="printer" variant="pillOutline" busy={busy === 'print'} onPress={() => run('print')} style={styles.grow} />
          </View>
          {can('report.email') ? (
            <Button title={busy === 'email' ? t.sending : t.sendReport} icon="mail" variant="pillOutline" busy={busy === 'email'} onPress={() => run('email')} />
          ) : null}
          <Button title={t.clear} icon="trash" variant="pillOutline" onPress={() => setConfirming(true)} disabled={totals.notes === 0 && !draft.countedBy.trim()} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.clearTitle}
        text={t.clearText}
        cancelLabel={t.cancel}
        confirmLabel={t.clearConfirm}
        closeLabel={t.close}
        onConfirm={() => {
          update(empty());
          setConfirming(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  body: { padding: 20, gap: 16 },
  intro: { fontSize: 14, color: Zinc[600] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  note: { width: 84, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  times: { fontSize: 15, color: Zinc[500] },
  qty: { width: 88 },
  figure: { fontWeight: '600', textAlign: 'right' },
  amount: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 15, fontWeight: '600', color: Zinc[900] },
});
