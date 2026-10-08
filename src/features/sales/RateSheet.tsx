import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SALES_COPY } from '@/features/sales/copy';
import type { SaleLine } from '@/features/sales/DeliverySheet';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { setSaleItemCost, useSaleWrite } from '@/services/sales.services';

/**
 * A sale line's purchase rate set by hand - the website's Purchase Rate box in
 * the ledger, for a line sold before its product had a rate, or at the wrong
 * one. Saved only when it changes: the server re-costs the line's stock each
 * time, where the website did so on every leave of the box.
 */
export function RateSheet({ line, onClose }: { line: SaleLine | null; onClose: () => void }) {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useSaleWrite();
  const [rate, setRate] = useState('');
  const [seeded, setSeeded] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each line opened starts from its own rate.
  const key = line ? String(line.item.id) : null;
  if (key !== seeded) {
    setSeeded(key);
    const current = Number(line?.item.cost_price || 0);
    setRate(current > 0 ? String(current) : '');
    setSubmitted(false);
    setError(null);
  }

  const value = parseAmount(rate);
  const invalid = rate.trim() === '' || !Number.isFinite(value) || value < 0;

  const save = async () => {
    if (!line || saving) return;
    setSubmitted(true);
    if (invalid) return;
    if (value === Number(line.item.cost_price || 0)) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await write(() => setSaleItemCost(String(line.item.id), value));
      toast.show(t.rateSaved);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={!!line} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <View style={styles.head}>
        <Txt accessibilityRole="header" style={styles.title}>
          {t.rateTitle}
        </Txt>
        <Txt style={styles.sub}>{line ? t.rateSub(String(line.item.product_name || ''), formatNumber(line.item.qty, lang)) : ''}</Txt>
      </View>
      <TextField
        tone="zinc"
        label={t.rateField}
        placeholder="0"
        value={rate}
        onChangeText={setRate}
        error={submitted && invalid ? t.errRate : undefined}
        plainError
        hint={t.rateHint}
        keyboardType="decimal-pad"
        inputStyle={styles.figure}
      />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={saving ? t.saving : t.save} variant="pill" onPress={save} busy={saving} style={styles.grow} />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  sub: { fontSize: 14, color: Zinc[600] },
  figure: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1, minWidth: 0 },
});
