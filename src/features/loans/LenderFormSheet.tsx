import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChoiceCard } from '@/components/ChoiceCard';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { InlineSwitch, SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Green, Red, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { todayISO } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { buildLoanAccountSms, smsBusiness } from '@/lib/smsTexts';
import { parseAmount } from '@/lib/money';
import { isBdPhone, normalizePhone } from '@/lib/validation';
import { useBusinessSettings } from '@/services/business.services';
import { createLender, updateLender, useLoanWrite, type Lender } from '@/services/loans.services';
import { sendSms, smsFailureMessage } from '@/services/sms.services';

type OpeningType = 'pawna' | 'dena' | 'zero';
type Form = { name: string; phone: string; address: string; type: OpeningType; amount: string; date: string; notes: string; active: boolean; welcome: boolean };

const DOTS: Record<OpeningType, string> = { pawna: Green[600], dena: Red[600], zero: Zinc[400] };

function formFor(lender: Lender | null): Form {
  const opening = Number(lender?.opening_balance || 0);
  return {
    name: lender?.name ?? '',
    phone: lender?.phone ?? '',
    address: lender?.address ?? '',
    type: opening > 0 ? 'pawna' : opening < 0 ? 'dena' : 'zero',
    amount: opening ? String(Math.abs(opening)) : '',
    date: lender?.opening_date ? String(lender.opening_date).slice(0, 10) : todayISO(),
    notes: lender?.notes ?? '',
    active: lender?.is_active !== false,
    welcome: false,
  };
}

/**
 * Add or edit a bank / person - Hatim's LoanLenderList form. The opening
 * balance is signed as the website stores it: Pawna positive, Dena negative.
 * A new account can be texted its opening balance (Welcome SMS).
 */
export function LenderFormSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Lender | null }) {
  const t = useCopy(LOAN_COPY);
  const toast = useToast();
  const write = useLoanWrite();
  const business = useBusinessSettings();
  const [form, setForm] = useState<Form>(() => formFor(null));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const seedKey = open ? editing?.id ?? 'new' : null;
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (seedKey) {
      setForm(formFor(editing));
      setSubmitted(false);
      setError(null);
    }
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const amount = form.amount.trim() === '' ? 0 : parseAmount(form.amount);
  // As the website checks it: an unchanged phone on an old record is let through.
  const phoneUnchanged = !!editing && form.phone.trim() === String(editing.phone || '').trim();

  const errors: Partial<Record<'name' | 'phone' | 'amount', string>> = {};
  if (!form.name.trim()) errors.name = t.errName;
  if (!form.phone.trim() || (!phoneUnchanged && !isBdPhone(form.phone))) errors.phone = t.errPhone;
  if (form.type !== 'zero') {
    if (Number.isNaN(amount)) errors.amount = t.errAmountInvalid;
    else if (!(amount > 0)) errors.amount = t.errOpening;
  }
  const shown = submitted ? errors : {};

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const opening = form.type === 'zero' ? 0 : form.type === 'dena' ? -amount : amount;
    const name = form.name.trim();
    const phone = phoneUnchanged ? form.phone.trim() : normalizePhone(form.phone);
    setSaving(true);
    setError(null);
    try {
      const input = {
        name,
        phone,
        address: form.address.trim(),
        lender_type: editing?.lender_type ?? 'person',
        opening_balance: opening,
        opening_date: form.date || null,
        notes: form.notes.trim(),
        is_active: form.active,
      };
      await write(() => (editing ? updateLender(editing.id, input) : createLender(input)));
      if (editing) {
        toast.show(t.personUpdated(name));
      } else if (form.welcome) {
        // After the save: the account is on the books whatever the gateway says.
        try {
          await sendSms([phone], buildLoanAccountSms({ ...smsBusiness(business.data), customerName: name, principal: opening }));
          toast.show(t.personAddedWelcome(name));
        } catch (e) {
          toast.show(smsFailureMessage(e, t.personSaved));
        }
      } else {
        toast.show(t.personAdded(name));
      }
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
        {editing ? t.editPerson : t.addPerson}
      </Txt>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Txt style={styles.label}>{t.name}</Txt>
          {editing ? null : <InlineSwitch label={t.welcomeSms} value={form.welcome} onChange={(welcome) => set({ welcome })} />}
        </View>
        <TextField
          tone="zinc"
          label=""
          accessibilityLabel={t.name}
          placeholder={t.namePlaceholder}
          value={form.name}
          onChangeText={(name) => set({ name })}
          error={shown.name}
          plainError
        />
      </View>
      <TextField
        tone="zinc"
        label={t.phone}
        placeholder="01XXXXXXXXX"
        value={form.phone}
        onChangeText={(phone) => set({ phone })}
        error={shown.phone}
        plainError
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <TextField tone="zinc" label={t.address} placeholder={t.optional} value={form.address} onChangeText={(address) => set({ address })} />

      <View style={styles.opening}>
        <Txt style={[styles.label, styles.legend]}>{t.openingBalance}</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.openingTypeLabel} style={styles.types}>
          {(['pawna', 'dena', 'zero'] as const).map((type) => (
            <ChoiceCard
              key={type}
              title={t.openingTypes[type].label}
              sub={t.openingTypes[type].sub}
              dot={DOTS[type]}
              selected={form.type === type}
              onPress={() => set(type === 'zero' ? { type, amount: '' } : { type })}
            />
          ))}
        </View>
        <View style={styles.pair}>
          <View style={styles.grow}>
            <TextField
              tone="zinc"
              label={t.amountShort}
              labelStyle={styles.smallLabel}
              placeholder="0"
              value={form.amount}
              onChangeText={(a) => set({ amount: a })}
              editable={form.type !== 'zero'}
              error={shown.amount ? ' ' : undefined}
              plainError
              keyboardType="decimal-pad"
              inputStyle={styles.amountInput}
            />
          </View>
          <View style={styles.grow}>
            <DateField label={t.asOfDate} labelStyle={styles.smallLabel} value={form.date} onChange={(date) => set({ date })} />
          </View>
        </View>
        {shown.amount ? <FieldError plain>{shown.amount}</FieldError> : null}
      </View>

      <TextField tone="zinc" label={t.notes} placeholder={t.optional} value={form.notes} onChangeText={(notes) => set({ notes })} minHeight={64} />
      <SwitchRow title={t.active} hint={t.activeHint} value={form.active} onChange={(active) => set({ active })} />

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
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  legend: { marginBottom: 6 },
  opening: { gap: 8 },
  types: { flexDirection: 'row', gap: 8 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  smallLabel: { fontSize: 13, color: Zinc[700] },
  amountInput: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
