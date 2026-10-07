import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { receivePurchaseLine, usePurchaseWrite } from '@/services/purchase.services';

type Row = Record<string, any>;

export type PurchaseLine = { purchase: Row; item: Row; received: number; due: number };

/**
 * Taking delivery of one line - Hatim's Product Received: the date, how many
 * arrived (all still due by default, never more), who took them and a note.
 * The server records it, adds the stock and its FIFO cost, and updates the
 * order's status, in one transaction.
 */
export function ReceiveLineSheet({ line, onClose }: { line: PurchaseLine | null; onClose: () => void }) {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = usePurchaseWrite();
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState('');
  const [receiver, setReceiver] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = line ? String(line.item.id) : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (line) {
      setDate(todayISO());
      setQty(String(line.due));
      setReceiver('');
      setNotes('');
      setSubmitted(false);
      setError(null);
    }
  }

  const count = parseAmount(qty);
  const due = line?.due ?? 0;
  const invalid = !Number.isInteger(count) || count <= 0 || count > due;

  const save = async () => {
    if (saving || !line) return;
    setSubmitted(true);
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      await write(() =>
        receivePurchaseLine(String(line.purchase.id), {
          purchase_item_id: String(line.item.id),
          receive_date: date,
          receiver_name: receiver.trim(),
          received_qty: count,
          condition: 'good',
          notes: notes.trim(),
        }),
      );
      toast.show(t.received);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={!!line} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <View>
        <Txt accessibilityRole="header" style={styles.title}>
          {t.receiveTitle}
        </Txt>
        <Txt style={styles.sub}>{`${line?.item.product_name ?? ''} · ${line?.purchase.si_no ?? ''} · ${t.stillDue(formatNumber(due, lang))}`}</Txt>
      </View>
      <View style={styles.pair}>
        <View style={styles.grow}>
          <DateField label={t.date} value={date} onChange={setDate} />
        </View>
        <View style={styles.grow}>
          <TextField
            tone="zinc"
            label={t.howMany}
            value={qty}
            onChangeText={setQty}
            error={submitted && invalid ? t.errReceive(formatNumber(due, lang)) : undefined}
            plainError
            keyboardType="number-pad"
            inputStyle={styles.figure}
          />
        </View>
      </View>
      <TextField tone="zinc" label={t.receivedBy} placeholder={t.receivedByPlaceholder} value={receiver} onChangeText={setReceiver} />
      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={notes} onChangeText={setNotes} />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={saving ? t.saving : t.save} variant="pill" onPress={save} busy={saving} style={styles.grow} />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={saving} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  sub: { fontSize: 14, color: Zinc[600] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
