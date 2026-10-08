import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { FigureCard } from '@/components/FigureCard';
import { LoadingState } from '@/components/LoadingState';
import { PromptCard } from '@/components/PromptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { PROGRESS_LOOK } from '@/constants/progress';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PriceChangeRow } from '@/features/products/PriceChangeRow';
import { PRICE_COPY } from '@/features/products/priceCopy';
import { useCan } from '@/hooks/useCan';
import { dateLabel, todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { detectPriceHeaderRow, PRICE_SAMPLE_ROWS, PRICE_SAVE_CHUNK, PRICE_SHEET_HEADERS, priceRowsFrom, rollbackRows, type PriceRow, type PriceUpdateResult } from '@/lib/priceFile';
import { chunkArray } from '@/lib/spreadsheet';
import { readSpreadsheet, saveAndShareXlsx } from '@/lib/spreadsheetFiles';
import { recordPriceUpdate, updatePrices, usePriceUpdates, useProductWrite } from '@/services/products.services';

// Drawn a slice at a time: a supplier's list can run to thousands of products.
const PAGE = 40;
const READABLE = /\.(xlsx|xls|csv)$/i;

type Preview = { result: PriceUpdateResult; rows: PriceRow[]; fileName: string };

/**
 * Prices across the catalogue from a spreadsheet - the website's Update Price:
 * a sample to fill in, a file chosen on the phone and read the website's way,
 * a preview of exactly what changes (and what is already right, and which
 * codes are not in the catalogue) before anything is written, then the save
 * in batches. The old prices are kept as a file first - uploading it undoes
 * the update - and every run is in the history.
 */
export default function UpdatePriceScreen() {
  const t = useCopy(PRICE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const can = useCan();
  const write = useProductWrite();
  const allowed = can('products.updatePrice');
  const history = usePriceUpdates();
  const [step, setStep] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [rollback, setRollback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const num = (n: unknown) => formatNumber(n, lang);
  const busy = step !== null;

  const share = async (work: () => Promise<unknown>) => {
    try {
      await work();
    } catch (e) {
      toast.show(errorMessage(e));
    }
  };

  const choose = async () => {
    if (busy) return;
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    const file = picked.canceled ? null : picked.assets?.[0];
    if (!file) return;
    if (!READABLE.test(file.name)) {
      setError(t.wrongType);
      return;
    }
    setPreview(null);
    setRollback(null);
    try {
      setStep(t.reading);
      const read = priceRowsFrom(await readSpreadsheet({ uri: file.uri, name: file.name }, detectPriceHeaderRow));
      if ('problem' in read) {
        setError(read.problem === 'noHeader' ? t.noHeader : t.noRows);
        return;
      }
      setStep(t.checking);
      // A dry run: every lookup happens, nothing is written.
      const result = await updatePrices(read.rows, true);
      setPreview({ result, rows: read.rows, fileName: file.name });
      setLimit(PAGE);
    } catch (e) {
      setError(errorMessage(e, t.readFailed));
    } finally {
      setStep(null);
    }
  };

  const apply = async () => {
    if (!preview || busy || preview.result.matched.length === 0) return;
    const { result, rows, fileName } = preview;
    setError(null);
    try {
      // The old prices are kept before a single row is written; a save that fails half way still has the right file to put back.
      setRollback(await saveAndShareXlsx(`prices-before-${todayISO()}.xlsx`, PRICE_SHEET_HEADERS, rollbackRows(result.matched), 'Prices'));
      const changing = new Set(result.matched.map((row) => row.product_code));
      const toSave = rows.filter((row) => changing.has(row.product_code));
      let done = 0;
      let updated = 0;
      setStep(t.savingProgress(num(0), num(toSave.length)));
      await write(async () => {
        for (const chunk of chunkArray(toSave, PRICE_SAVE_CHUNK)) {
          const saved = await updatePrices(chunk, false);
          updated += saved.matched.length;
          done += chunk.length;
          setStep(t.savingProgress(num(done), num(toSave.length)));
        }
        // One history line for the run, with what the server reported. The prices stand without it.
        await recordPriceUpdate({
          file_name: fileName,
          updated_count: updated,
          skipped_count: result.notFound.length,
          unchanged_count: result.unchanged.length,
          status: updated === toSave.length ? 'completed' : 'partial',
        }).catch(() => undefined);
      });
      toast.show(t.done(num(updated), num(result.notFound.length), num(result.unchanged.length)));
      setPreview(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setStep(null);
    }
  };

  const matched = preview?.result.matched ?? [];
  const notFound = preview?.result.notFound ?? [];
  const unchanged = preview?.result.unchanged ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.title} onBack={() => router.back()} backLabel={t.back} />
      {!allowed ? (
        <View style={styles.body}>
          <PromptCard icon="percent" text={t.ownerOnly} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Txt style={styles.intro}>{t.subtitle}</Txt>
          <AlertBanner tone="error">{error}</AlertBanner>
          {step ? (
            <View style={styles.step}>
              <Spinner color={Zinc[900]} size={20} />
              <Txt style={styles.stepText}>{step}</Txt>
            </View>
          ) : null}

          {preview ? (
            <>
              <View style={styles.row}>
                <FigureCard label={t.willChange} value={num(matched.length)} valueColor={Green[700]} />
                <FigureCard label={t.alreadyCorrect} value={num(unchanged.length)} />
                <FigureCard label={t.notFound} value={num(notFound.length)} valueColor={notFound.length ? Red[600] : undefined} />
              </View>
              {matched.length > 0 ? <Button title={t.apply} icon="check" variant="pill" onPress={apply} busy={busy} /> : null}
              <Button title={t.cancel} variant="pillOutline" onPress={choose} disabled={busy} />
              {notFound.length > 0 ? (
                <View style={styles.missing}>
                  <Txt style={styles.missingTitle}>{t.notFoundHint}</Txt>
                  <Txt style={styles.codes}>{notFound.join(', ')}</Txt>
                </View>
              ) : null}
              {matched.length === 0 ? (
                <Txt style={styles.intro}>{t.nothingToChange}</Txt>
              ) : (
                matched.slice(0, limit).map((row) => <PriceChangeRow key={row.product_code} row={row} />)
              )}
              {matched.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
            </>
          ) : (
            <>
              {rollback ? (
                <View style={styles.rollback}>
                  <Txt style={styles.rollbackText}>{t.rollbackNote}</Txt>
                  <Button
                    title={t.shareOld}
                    icon="share"
                    variant="pillOutline"
                    onPress={() => share(async () => (await Sharing.isAvailableAsync()) && Sharing.shareAsync(rollback))}
                  />
                </View>
              ) : null}
              <View style={styles.how}>
                <Txt accessibilityRole="header" style={styles.title}>
                  {t.howTitle}
                </Txt>
                {t.how.map((line) => (
                  <View key={line} style={styles.howRow}>
                    <DesignIcon name="check" size={16} color={Green[700]} strokeWidth={2.6} />
                    <Txt style={styles.howText}>{line}</Txt>
                  </View>
                ))}
              </View>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Button
                    title={t.sample}
                    icon="download"
                    variant="pillOutline"
                    onPress={() => share(() => saveAndShareXlsx('price-update-sample.xlsx', PRICE_SHEET_HEADERS, PRICE_SAMPLE_ROWS, 'Prices'))}
                    disabled={busy}
                  />
                </View>
                <View style={styles.grow}>
                  <Button title={t.upload} icon="upload" variant="pill" onPress={choose} busy={busy} />
                </View>
              </View>

              <Txt accessibilityRole="header" style={styles.title}>
                {t.historyTitle}
              </Txt>
              {history.isPending ? (
                <LoadingState minHeight={120} />
              ) : (history.data ?? []).length === 0 ? (
                <Txt style={styles.intro}>{t.historyEmpty}</Txt>
              ) : (
                <View style={styles.list}>
                  {(history.data ?? []).map((run, i) => {
                    const look = run.status === 'partial' ? PROGRESS_LOOK.some : PROGRESS_LOOK.all;
                    return (
                      <View key={run.id} style={[styles.run, i > 0 && styles.divider]}>
                        <View style={styles.runBody}>
                          <Txt style={styles.runFile} numberOfLines={1}>
                            {run.file_name || '-'}
                          </Txt>
                          <Txt style={styles.runMeta}>{`${dateLabel(String(run.created_at).slice(0, 10), lang)} · ${t.itemsUpdated(num(run.updated_count))}`}</Txt>
                        </View>
                        <View style={[styles.badge, { backgroundColor: look.bg }]}>
                          <Txt style={[styles.badgeText, { color: look.ink }]}>{t.statuses[run.status === 'partial' ? 'partial' : 'completed']}</Txt>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  body: { padding: 20, gap: 14 },
  intro: { fontSize: 14, color: Zinc[600] },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: Zinc[100] },
  stepText: { flex: 1, fontSize: 14, color: Zinc[700] },
  missing: { gap: 4, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Zinc[200] },
  missingTitle: { fontSize: 14, fontWeight: '600', color: Red[700] },
  codes: { fontSize: 12, color: Zinc[600] },
  rollback: { gap: 8, padding: 14, borderRadius: 16, backgroundColor: Green[50] },
  rollbackText: { fontSize: 14, color: Zinc[700] },
  how: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Zinc[200] },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  howText: { flex: 1, fontSize: 14, color: Zinc[700] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  run: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  runBody: { flex: 1, minWidth: 0 },
  runFile: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  runMeta: { fontSize: 12, color: Zinc[500] },
  badge: { paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
