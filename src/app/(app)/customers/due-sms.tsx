import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CheckRow } from '@/components/CheckRow';
import { ConfirmSheet } from '@/components/ItemSheets';
import { PromptCard } from '@/components/PromptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { canRemind, dueReminderText, reminderNumber, remindersCost } from '@/features/customers/dueSms';
import { useCan } from '@/hooks/useCan';
import { buildCustomerDashboard } from '@/lib/customerDue';
import { formatNumber } from '@/lib/money';
import { matches } from '@/lib/search';
import { smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { useCustomerData } from '@/services/customers.services';
import { sendSms, smsFailureReason, SMS_KEY, useSmsWallet } from '@/services/sms.services';

// Drawn a slice at a time: a shop's customers can run to thousands.
const PAGE = 60;

/**
 * Reminding many customers of their due at once - the website Customer
 * Dashboard's Send Due SMS: everyone who owes and has a mobile, chosen one by
 * one or all at once, each texted their own due, one at a time so a failure
 * part-way spends no more. What it costs is shown against the balance first.
 * Those reached are taken off the choice, so trying again goes only to whoever
 * was missed. The owner's alone, as the server allows.
 */
export default function DueSmsScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const queryClient = useQueryClient();
  const owner = can('sms.send');
  const { data } = useCustomerData();
  const business = useBusinessSettings();
  const wallet = useSmsWallet(owner);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [confirming, setConfirming] = useState(false);
  // How many have gone while sending; null otherwise.
  const [progress, setProgress] = useState<number | null>(null);

  const num = (n: unknown) => formatNumber(n, lang);
  const sms = smsBusiness(business.data);
  const { customerList } = buildCustomerDashboard(data?.customers ?? [], data?.sales ?? [], data?.payments ?? []);
  const owing = customerList.filter((c) => Number(c.currentDue) > 0);
  const textable = owing.filter(canRemind).sort((a, b) => Number(b.currentDue) - Number(a.currentDue));
  const shown = textable.filter((c) => matches(search, c.name, c.phone));
  const chosen = new Set(selected);
  const targets = textable.filter((c) => chosen.has(c.id));
  const credits = remindersCost(sms, targets);
  const balance = wallet.data?.balance;
  const short = balance !== undefined && credits > balance;
  const allShownChosen = shown.length > 0 && shown.every((c) => chosen.has(c.id));
  const sending = progress !== null;

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const toggleShown = () => {
    const ids = new Set(shown.map((c) => c.id));
    setSelected((current) => (allShownChosen ? current.filter((id) => !ids.has(id)) : [...new Set([...current, ...ids])]));
  };

  const send = async () => {
    setConfirming(false);
    setProgress(0);
    let sent = 0;
    let failed = 0;
    // Every failure tends to have the one cause - the credits, the gateway - so the first is kept to say why.
    let firstFailure: unknown = null;
    const reached: string[] = [];
    for (const customer of targets) {
      try {
        await sendSms([reminderNumber(customer)], dueReminderText(sms, customer));
        sent += 1;
        reached.push(customer.id);
      } catch (e) {
        if (firstFailure === null) firstFailure = e;
        failed += 1;
      }
      setProgress(sent + failed);
    }
    setProgress(null);
    setSelected((current) => current.filter((id) => !reached.includes(id)));
    await queryClient.invalidateQueries({ queryKey: SMS_KEY });
    toast.show([sent > 0 ? t.bulkSent(num(sent)) : '', failed > 0 ? t.bulkFailed(num(failed), smsFailureReason(firstFailure)) : ''].filter(Boolean).join(' '));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.bulkTitle} onBack={() => router.back()} backLabel={t.back} />
      {!owner ? (
        <View style={styles.body}>
          <PromptCard icon="message" text={t.smsOwnerOnly} />
        </View>
      ) : !data ? (
        <View style={styles.state}>
          <Spinner color={Zinc[900]} size={24} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {textable.length === 0 ? (
              <PromptCard icon="message" text={t.bulkNone} />
            ) : (
              <>
                <Txt style={styles.intro}>{t.bulkIntro}</Txt>
                {balance !== undefined ? <Txt style={styles.hint}>{t.bulkBalance(num(balance))}</Txt> : null}
                <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.bulkSearch} label={t.searchLabel} />
                {shown.length > 0 ? <Button title={allShownChosen ? t.clearShown : t.selectShown} variant="pillOutline" onPress={toggleShown} disabled={sending} /> : null}
                {shown.slice(0, limit).map((customer) => (
                  <CheckRow
                    key={customer.id}
                    title={customer.name || ''}
                    meta={customer.phone || ''}
                    end={money(customer.currentDue)}
                    checked={chosen.has(customer.id)}
                    onPress={() => !sending && toggle(customer.id)}
                    label={`${customer.name}, ${money(customer.currentDue)}`}
                  />
                ))}
                {shown.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
                {targets.length > 0 ? (
                  <View style={styles.sample}>
                    <Txt style={styles.sampleLabel}>{t.bulkSample}</Txt>
                    <Txt style={styles.sampleText}>{dueReminderText(sms, targets[0])}</Txt>
                  </View>
                ) : null}
              </>
            )}
            {owing.length > textable.length ? <Txt style={styles.hint}>{t.bulkNoPhone(num(owing.length - textable.length))}</Txt> : null}
          </ScrollView>
          {textable.length > 0 ? (
            <View style={styles.footer}>
              {short ? <Txt style={styles.short}>{t.bulkShort(num(credits), num(balance))}</Txt> : null}
              <Button
                title={sending ? t.bulkSending(num(progress), num(targets.length)) : targets.length > 0 ? t.bulkSend(num(targets.length), num(credits)) : t.bulkPick}
                icon="message"
                variant="pill"
                onPress={() => setConfirming(true)}
                busy={sending}
                disabled={targets.length === 0 || short || sending}
              />
            </View>
          ) : null}
        </>
      )}

      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.bulkConfirmTitle}
        text={t.bulkConfirmText(num(targets.length), num(credits))}
        cancelLabel={t.cancel}
        confirmLabel={t.reminderConfirm}
        closeLabel={t.close}
        icon="message"
        tone="primary"
        onConfirm={send}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 10 },
  intro: { fontSize: 14, color: Zinc[600] },
  hint: { fontSize: 13, color: Zinc[500] },
  sample: { gap: 4, marginTop: 6, padding: 14, borderRadius: 16, backgroundColor: Zinc[100] },
  sampleLabel: { fontSize: 12, fontWeight: '600', color: Zinc[600] },
  sampleText: { fontSize: 14, color: Zinc[900] },
  footer: { gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: Zinc[200], backgroundColor: White },
  short: { fontSize: 13, fontWeight: '600', color: Red[700] },
});
