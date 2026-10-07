import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { SuggestionChips } from '@/components/SuggestionChips';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { returnsStock, type DamageReceiveResult } from '@/lib/damageRules';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber, parseAmount } from '@/lib/money';
import { receiveDamageItem, useDamageWrite, type DamageEntry, type DamageItem } from '@/services/damage.services';

const RESULTS: DamageReceiveResult[] = ['repaired', 'replaced', 'scrapped'];

export type PendingLine = { entry: DamageEntry; item: DamageItem; outstanding: number };

/**
 * Taking back one line - Hatim's Receive: how many, in what state, and who
 * took delivery. What it does to the books is said before saving, because
 * the three results are three different things: back on the shelf at the
 * cost it left with, or written off as a loss.
 */
export function ReceiveSheet({ line, employees, onClose }: { line: PendingLine | null; employees: string[]; onClose: () => void }) {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useDamageWrite();
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState('');
  const [result, setResult] = useState<DamageReceiveResult>('repaired');
  const [receiver, setReceiver] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = line?.item.id ?? null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (line) {
      setDate(todayISO());
      setQty(String(line.outstanding));
      // An entry sent out to be exchanged most often comes back replaced.
      setResult(line.entry.action === 'exchange' ? 'replaced' : 'repaired');
      setReceiver('');
      setNotes('');
      setSubmitted(false);
      setError(null);
    }
  }

  const count = parseAmount(qty);
  const outstanding = line?.outstanding ?? 0;
  const qtyError = !Number.isInteger(count) || count <= 0 || count > outstanding;
  const each = Number(line?.item.unit_cost || 0);

  const save = async () => {
    if (saving || !line) return;
    setSubmitted(true);
    if (qtyError) return;
    setSaving(true);
    setError(null);
    try {
      await write(() =>
        receiveDamageItem(line.entry.id, {
          damage_item_id: line.item.id,
          receive_date: date,
          receiver_name: receiver.trim(),
          received_qty: count,
          result,
          notes: notes.trim(),
        }),
      );
      toast.show(returnsStock(result) ? t.receivedToast : t.writtenOffToast);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const back = returnsStock(result);
  const shownCount = Number.isInteger(count) && count > 0 ? count : 0;

  return (
    <BottomSheet open={!!line} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <View>
        <Txt accessibilityRole="header" style={styles.title}>
          {t.receiveTitle}
        </Txt>
        <Txt style={styles.sub}>{`${line?.item.product_name ?? ''} · ${line?.entry.doc_no ?? ''}`}</Txt>
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
            error={submitted && qtyError ? t.errBack(formatNumber(outstanding, lang)) : undefined}
            plainError
            keyboardType="number-pad"
            inputStyle={styles.figure}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Txt style={styles.label}>{t.whatCame}</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.whatCame} style={styles.row}>
          {RESULTS.map((key) => (
            <ChoiceCard key={key} title={t.results[key].label} sub={t.results[key].sub} selected={result === key} onPress={() => setResult(key)} />
          ))}
        </View>
      </View>

      <View style={[styles.effect, { backgroundColor: back ? Green[50] : Red[50] }]}>
        <Txt style={[styles.effectText, { color: back ? Green[800] : Red[800] }]}>
          {back ? t.backInStock(formatNumber(shownCount, lang), money(each)) : t.writeOffNote(money(shownCount * each))}
        </Txt>
      </View>

      <View style={styles.group}>
        <TextField tone="zinc" label={t.receivedBy} placeholder={t.receivedByPlaceholder} value={receiver} onChangeText={setReceiver} />
        <SuggestionChips suggestions={employees} value={receiver} onPick={setReceiver} max={5} />
      </View>
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
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  effect: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  effectText: { fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
