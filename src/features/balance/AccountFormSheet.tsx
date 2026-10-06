import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BALANCE_COPY } from '@/features/balance/copy';
import type { Account } from '@/lib/balance';
import { errorMessage } from '@/lib/httpClient';
import { parseAmount } from '@/lib/money';
import { createAccount, updateAccount, useBalanceWrite } from '@/services/balance.services';

/** Add or edit a wallet account: its name and opening balance. */
export function AccountFormSheet({
  open,
  onClose,
  editing,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  editing: Account | null;
  accounts: Account[];
}) {
  const t = useCopy(BALANCE_COPY);
  const toast = useToast();
  const write = useBalanceWrite();
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('0');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setName(editing?.name ?? '');
      setOpening(String(editing?.opening_balance ?? 0));
      setSubmitted(false);
      setError(null);
    }
  }

  // The design's checks: a name, not another account's, and a number (which
  // may be negative - an overdrawn account starts below zero).
  const trimmed = name.trim();
  const amount = opening.trim() === '' ? 0 : parseAmount(opening, { allowNegative: true });
  const errors: { name?: string; opening?: string } = {};
  if (!trimmed) errors.name = t.errName;
  else if (accounts.some((a) => a.id !== editing?.id && a.name.trim().toLowerCase() === trimmed.toLowerCase())) errors.name = t.errDuplicate;
  if (Number.isNaN(amount)) errors.opening = t.errOpening;
  const shown = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const input = { name: trimmed, opening_balance: amount };
      await write(() => (editing ? updateAccount(editing.id, input) : createAccount(input)));
      toast.show(editing ? t.accountUpdated : t.accountAdded);
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
        {editing ? t.editAccount : t.addAccount}
      </Txt>
      <TextField tone="zinc" label={t.name} placeholder={t.namePh} value={name} onChangeText={setName} error={shown.name} plainError />
      <TextField
        tone="zinc"
        label={t.openingBalance}
        value={opening}
        onChangeText={setOpening}
        error={shown.opening}
        plainError
        hint={t.openingHint}
        keyboardType="numbers-and-punctuation"
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
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1 },
});
