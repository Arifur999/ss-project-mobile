import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { INVENTORY_COPY } from '@/features/inventory/copy';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { adjustStock, useStockWrite, type StockRow } from '@/services/inventory.services';

type Direction = 'add' | 'remove';

/**
 * A manual stock correction, as the website's adjust box makes it - but asked
 * as Add or Remove and a count, rather than a signed number, so nobody has to
 * know that "-5" means five left. Shows the stock before and after, and the
 * button says which it does - "Remove 82 pcs" - since the sheet opens on
 * Remove and a count meant to go in would otherwise come off.
 */
export function AdjustStockSheet({ row, onClose }: { row: StockRow | null; onClose: () => void }) {
  const t = useCopy(INVENTORY_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useStockWrite();
  const [direction, setDirection] = useState<Direction>('remove');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = row?.id ?? null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setDirection('remove');
      setQty('');
      setReason('');
      setSubmitted(false);
      setError(null);
    }
  }

  const count = parseAmount(qty);
  const valid = Number.isInteger(count) && count > 0;
  const change = valid ? (direction === 'add' ? count : -count) : 0;
  const before = Number(row?.available_qty || 0);
  const after = before + change;

  const save = async () => {
    if (saving || !row) return;
    setSubmitted(true);
    if (!valid) return;
    const name = row.products?.name ?? '';
    setSaving(true);
    setError(null);
    try {
      await write(() =>
        adjustStock({ product_id: row.product_id, product_name: name, qty_change: change, notes: reason.trim() || t.defaultReason }),
      );
      toast.show(t.adjusted(name));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={!!row} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <View>
        <Txt accessibilityRole="header" style={styles.title}>
          {t.adjust}
        </Txt>
        <Txt style={styles.sub}>{`${row?.products?.name ?? ''} · ${t.inStock} ${formatNumber(before, lang)}`}</Txt>
      </View>
      <Txt style={styles.hint}>{t.adjustHint}</Txt>
      <Segmented
        label={t.adjust}
        value={direction}
        onChange={setDirection}
        height={44}
        fontSize={14}
        segments={[
          { key: 'remove', label: t.remove, icon: 'arrowDown', activeInk: Red[700] },
          { key: 'add', label: t.add, icon: 'arrowUp', activeInk: Green[700] },
        ]}
      />
      <TextField
        tone="zinc"
        label={t.qtyField}
        placeholder="0"
        value={qty}
        onChangeText={setQty}
        error={submitted && !valid ? t.errQty : undefined}
        plainError
        keyboardType="number-pad"
        inputStyle={styles.qty}
      />
      {valid ? (
        <View style={styles.preview}>
          <Txt style={styles.previewText}>{`${formatNumber(before, lang)} → `}</Txt>
          <Txt style={[styles.previewText, styles.previewAfter, after < 0 && styles.negative]}>{formatNumber(after, lang)}</Txt>
        </View>
      ) : null}
      <TextField tone="zinc" label={t.reasonField} placeholder={t.reasonPlaceholder} value={reason} onChangeText={setReason} />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button
          title={saving ? t.saving : valid ? (direction === 'add' ? t.addPcs : t.removePcs)(formatNumber(count, lang)) : t.save}
          variant="pill"
          onPress={save}
          busy={saving}
          style={styles.grow}
        />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  sub: { fontSize: 14, color: Zinc[600] },
  hint: { fontSize: 13, color: Zinc[500] },
  qty: { fontWeight: '600' },
  preview: { flexDirection: 'row', alignItems: 'baseline' },
  previewText: { fontSize: 15, fontWeight: '600', color: Zinc[600] },
  previewAfter: { color: Zinc[900] },
  negative: { color: Red[600] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
