import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FigureCard } from '@/components/FigureCard';
import { LoadingState } from '@/components/LoadingState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { TOOLS_COPY } from '@/features/tools/copy';
import { dateLabel, timeLabel, todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { printTable, shareTablePdf, type PrintableTable } from '@/lib/print';
import { useDayActivity, type ActivityEvent } from '@/services/activity.services';

/** "09:30" from an entry's timestamp, in the phone's own time. */
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * What was done on a day - the website's Today's history: every entry made
 * that day, in the order it was made, with what came in and went out, and
 * Share PDF and Print. Yesterday is a date change away.
 */
export default function DayHistoryScreen() {
  const t = useCopy(TOOLS_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const query = useDayActivity(date);
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);

  const data = query.data;
  const events = data?.events ?? [];
  const kindOf = (event: ActivityEvent) => t.kinds[event.kind] ?? event.kind;
  const signed = (event: ActivityEvent) => (event.direction === 'none' ? '-' : `${event.direction === 'in' ? '+' : '−'}${money(event.amount)}`);

  const table = (): PrintableTable => ({
    title: t.historyTitle,
    subtitle: dateLabel(date, lang),
    columns: [{ label: t.colTime }, { label: t.colWhat }, { label: t.colWho }, { label: t.amount, align: 'right' }],
    rows: events.map((e) => [timeLabel(hhmm(e.at), lang), kindOf(e), [e.title, e.subtitle].filter(Boolean).join(' · '), signed(e)]),
    footer: [
      [t.entries, formatNumber(data?.count ?? 0, lang)],
      [t.moneyIn, money(data?.totals.in ?? 0)],
      [t.moneyOut, money(data?.totals.out ?? 0)],
    ],
  });

  const output = async (kind: 'share' | 'print') => {
    if (busy || events.length === 0) return;
    setBusy(kind);
    try {
      if (kind === 'share') await shareTablePdf(table(), `${t.historyTitle} ${date}`);
      else await printTable(table());
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.historyTitle} onBack={() => router.back()} backLabel={t.back} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={Zinc[900]} />}>
        <DateField label={t.date} value={date} onChange={setDate} />
        <View style={styles.row}>
          <FigureCard label={t.entries} value={formatNumber(data?.count ?? 0, lang)} />
          <FigureCard label={t.moneyIn} value={money(data?.totals.in ?? 0)} valueColor={Green[700]} />
        </View>
        <FigureCard label={t.moneyOut} value={money(data?.totals.out ?? 0)} valueColor={Red[600]} />
        <Txt style={styles.note}>{t.historyNote}</Txt>

        {query.isPending ? (
          <LoadingState minHeight={200} />
        ) : query.isError ? (
          <View style={styles.state}>
            <AlertBanner tone="error">{t.loadError}</AlertBanner>
            <Button title={t.retry} variant="pillOutline" onPress={() => query.refetch()} />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.empty}>
            <Txt style={styles.emptyText}>{t.empty}</Txt>
          </View>
        ) : (
          <View style={styles.list}>
            {events.map((event, i) => (
              <View key={`${event.at}-${i}`} style={[styles.item, i > 0 && styles.divider]}>
                <Txt style={styles.time}>{timeLabel(hhmm(event.at), lang)}</Txt>
                <View style={styles.what}>
                  <Txt style={styles.kind}>{kindOf(event)}</Txt>
                  <Txt style={styles.detail} numberOfLines={2}>
                    {[event.title, event.subtitle].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                <Txt style={[styles.amount, event.direction === 'in' ? styles.in : event.direction === 'out' ? styles.out : styles.none]}>{signed(event)}</Txt>
              </View>
            ))}
          </View>
        )}

        {events.length > 0 ? (
          <View style={styles.row}>
            <Button title={t.sharePdf} icon="share" variant="pill" busy={busy === 'share'} onPress={() => output('share')} style={styles.grow} />
            <Button title={t.print} icon="printer" variant="pillOutline" busy={busy === 'print'} onPress={() => output('print')} style={styles.grow} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  body: { padding: 20, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  note: { fontSize: 13, color: Zinc[500] },
  state: { minHeight: 200, justifyContent: 'center', gap: 12 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  time: { width: 68, fontSize: 12, color: Zinc[500], paddingTop: 2 },
  what: { flex: 1, minWidth: 0, gap: 1 },
  kind: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  detail: { fontSize: 12, color: Zinc[600] },
  amount: { flexShrink: 0, fontSize: 14, fontWeight: '600' },
  in: { color: Green[700] },
  out: { color: Red[600] },
  none: { color: Zinc[400] },
});
