import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard, PICKED_IN, PICKED_OUT } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { addDamageMoney, useDamageData, useDamageWrite, type DamageMoneyInput } from '@/services/damage.services';

type Kind = DamageMoneyInput['kind'];

/**
 * A repair paid for, or a refund the supplier paid back - Hatim's Damage
 * "Add transaction". It lands as an expense or other income tied to its
 * entry, so balances, the P&L and the reports count it.
 */
export function DamageMoneySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useCopy(DAMAGE_COPY);
  const toast = useToast();
  const write = useDamageWrite();
  const { data } = useDamageData();
  const [kind, setKind] = useState<Kind>('repair_cost');
  const [entryId, setEntryId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setKind('repair_cost');
      setEntryId('');
      setDate(todayISO());
      setAmount('');
      setAccountId('');
      setNotes('');
      setSubmitted(false);
      setError(null);
    }
  }

  const value = parseAmount(amount);
  const errors = {
    entry: !entryId ? t.errEntry : undefined,
    amount: !(value > 0) ? t.errAmount : undefined,
    account: !accountId ? t.errAccount : undefined,
  };
  const shown: Partial<typeof errors> = submitted ? errors : {};
  const accounts = data?.accounts ?? [];

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (errors.entry || errors.amount || errors.account) return;
    setSaving(true);
    setError(null);
    try {
      const account = accounts.find((a) => a.id === accountId);
      await write(() => addDamageMoney(entryId, { kind, date, amount: value, account_id: accountId, account_name: account?.name || '', notes: notes.trim() }));
      toast.show(t.moneySaved);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !saving && onClose()} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.addMoney}
      </Txt>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.addMoney} style={styles.row}>
        <ChoiceCard
          icon="arrowUpRight"
          title={t.kinds.repair_cost.label}
          sub={t.kinds.repair_cost.sub}
          picked={PICKED_OUT}
          selected={kind === 'repair_cost'}
          onPress={() => setKind('repair_cost')}
        />
        <ChoiceCard
          icon="arrowDownLeft"
          title={t.kinds.supplier_refund.label}
          sub={t.kinds.supplier_refund.sub}
          picked={PICKED_IN}
          selected={kind === 'supplier_refund'}
          onPress={() => setKind('supplier_refund')}
        />
      </View>
      <SelectField
        label={t.whichEntry}
        placeholder={t.chooseEntry}
        closeLabel={t.close}
        value={entryId}
        options={(data?.entries ?? []).map((entry) => ({
          key: entry.id,
          label: `${entry.doc_no} - ${entry.damage_items.map((item) => item.product_name).join(', ')}`,
        }))}
        onChange={setEntryId}
        error={shown.entry}
        searchPlaceholder={t.searchEntries}
        emptyText={t.nothingInPeriod}
      />
      <View style={styles.pair}>
        <View style={styles.grow}>
          <DateField label={t.date} value={date} onChange={setDate} />
        </View>
        <View style={styles.grow}>
          <TextField
            tone="zinc"
            label={t.amount}
            placeholder="0"
            value={amount}
            onChangeText={setAmount}
            error={shown.amount}
            plainError
            keyboardType="decimal-pad"
            inputStyle={styles.figure}
          />
        </View>
      </View>
      <SelectField
        label={t.account}
        placeholder={t.chooseAccount}
        closeLabel={t.close}
        value={accountId}
        options={accounts.map((a) => ({ key: a.id, label: a.name }))}
        onChange={setAccountId}
        error={shown.account}
      />
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
  row: { flexDirection: 'row', gap: 8 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  figure: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
