import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { FigureCard } from '@/components/FigureCard';
import { ConfirmSheet } from '@/components/ItemSheets';
import { PromptCard } from '@/components/PromptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Amber, Red, White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { MARKETING_COPY } from '@/features/marketing/copy';
import { RecipientSheet } from '@/features/marketing/RecipientSheet';
import { useCan } from '@/hooks/useCan';
import { dateLabel, todayISO } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { failedSends, smsStats } from '@/lib/smsStats';
import { segmentsFor } from '@/lib/smsTexts';
import { useContacts } from '@/services/marketing.services';
import { sendSms, smsFailureMessage, SMS_KEY, useSmsMessages, useSmsWallet } from '@/services/sms.services';

const FAILURES_SHOWN = 5;
const BODY_MAX = 1000;

/**
 * Sending SMS to the shop's people - the website's Marketing page, without
 * buying credits: the balance, today's and this month's sends and the
 * delivery rate, a message with what it costs, the recipients, and what the
 * gateway refused. The owner's alone, as the server allows.
 */
export default function MarketingScreen() {
  const t = useCopy(MARKETING_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const can = useCan();
  const queryClient = useQueryClient();
  const owner = can('sms.send');
  const wallet = useSmsWallet(owner);
  const log = useSmsMessages(owner);
  const contacts = useContacts(owner);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const num = (n: unknown) => formatNumber(n, lang);
  const stats = smsStats(log.data ?? [], todayISO());
  const failures = failedSends(log.data ?? []).slice(0, FAILURES_SHOWN);
  const chosen = (contacts.data ?? []).filter((c) => selected.includes(c.id));
  const phones = [...new Set(chosen.map((c) => c.phone.trim()).filter(Boolean))];
  const segments = segmentsFor(message);
  const unicode = [...message].some((ch) => ch.charCodeAt(0) > 127);
  const credits = segments * phones.length;
  const balance = wallet.data?.balance;
  const short = balance !== undefined && credits > balance;
  const errors = { message: !message.trim() ? t.errMessage : undefined, recipients: phones.length === 0 ? t.errRecipients : undefined };

  const ask = () => {
    setSubmitted(true);
    if (errors.message || errors.recipients || short) return;
    setConfirming(true);
  };

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = await sendSms(phones, message.trim());
      toast.show(t.sent(num(result.recipients), num(result.credits_used)));
      // A fresh composer, so the same message cannot go out twice by accident.
      setMessage('');
      setSelected([]);
      setSubmitted(false);
    } catch (e) {
      toast.show(smsFailureMessage(e));
    } finally {
      setSending(false);
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: SMS_KEY });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.title} onBack={() => router.navigate('/more')} backLabel={t.backToMenu} />
      {!owner ? (
        <View style={styles.body}>
          <PromptCard icon="megaphone" text={t.ownerOnly} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={wallet.isRefetching || log.isRefetching}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: SMS_KEY })}
                tintColor={Zinc[900]}
              />
            }>
            <FigureCard dark label={t.balance} value={balance === undefined ? '-' : num(balance)} />
            <View style={styles.row}>
              <FigureCard label={t.sentToday} value={num(stats.sentToday)} />
              <FigureCard label={t.campaigns} value={num(stats.campaignsThisMonth)} />
              <FigureCard label={t.deliveryRate} value={`${num(Math.round(stats.deliveryRate))}%`} />
            </View>

            <Txt accessibilityRole="header" style={styles.title}>
              {t.composer}
            </Txt>
            <TextField
              tone="zinc"
              label={t.message}
              placeholder={t.messagePlaceholder}
              value={message}
              onChangeText={setMessage}
              error={submitted ? errors.message : undefined}
              plainError
              multiline
              minHeight={110}
              maxLength={BODY_MAX}
              hint={t.counter(num(message.length), num(segments), unicode)}
            />

            <View style={styles.group}>
              <Txt style={styles.label}>{t.recipients}</Txt>
              <Button title={t.chooseRecipients} icon="users" variant="pillOutline" onPress={() => setPicking(true)} disabled={!contacts.data} />
              {contacts.isError ? <AlertBanner tone="error">{t.loadError}</AlertBanner> : null}
              {selected.length > 0 ? <Txt style={styles.hint}>{t.chosen(num(chosen.length), num(phones.length))}</Txt> : null}
              {submitted && errors.recipients ? <FieldError plain>{errors.recipients}</FieldError> : null}
            </View>

            {phones.length > 0 && message.trim() ? (
              <Txt style={[styles.cost, short && styles.short]}>{short ? t.notEnough(num(credits), num(balance)) : t.cost(num(credits))}</Txt>
            ) : null}
            <Button title={t.send} icon="message" variant="pill" onPress={ask} busy={sending} disabled={short} />

            {failures.length > 0 ? (
              <View style={styles.group}>
                <Txt accessibilityRole="header" style={styles.title}>
                  {t.failures}
                </Txt>
                <Txt style={styles.hint}>{t.failuresHint}</Txt>
                <View style={styles.list}>
                  {failures.map((row, i) => (
                    <View key={row.id} style={[styles.failure, i > 0 && styles.divider]}>
                      <Txt style={styles.failureMeta}>{`${dateLabel(String(row.created_at).slice(0, 10), lang)} · ${num(row.recipient_count)}`}</Txt>
                      <Txt style={styles.failureText} numberOfLines={2}>
                        {row.message}
                      </Txt>
                      {row.response ? (
                        <Txt style={styles.response} numberOfLines={3}>
                          {row.response}
                        </Txt>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <RecipientSheet open={picking} contacts={contacts.data ?? []} selected={selected} onChange={setSelected} onClose={() => setPicking(false)} />
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.confirmTitle}
        text={`${t.confirmText(num(phones.length), num(credits))}\n\n${message.trim()}`}
        cancelLabel={t.cancel}
        confirmLabel={t.send}
        closeLabel={t.close}
        busy={sending}
        icon="message"
        tone="primary"
        onConfirm={send}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  body: { padding: 20, gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  group: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  hint: { fontSize: 13, color: Zinc[500] },
  cost: { fontSize: 14, fontWeight: '600', color: Zinc[700] },
  short: { color: Red[700] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  failure: { gap: 2, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  failureMeta: { fontSize: 12, color: Zinc[500] },
  failureText: { fontSize: 14, color: Zinc[900] },
  response: { fontSize: 12, color: Amber[800] },
});
