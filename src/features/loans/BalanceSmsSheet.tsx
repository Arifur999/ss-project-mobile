import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { summaryPhone, type LoanSummary } from '@/features/loans/OutstandingCard';
import { SIDE_LOOK, sideOf } from '@/features/loans/side';
import { buildLoanBalanceSms, smsBusiness } from '@/lib/loanSms';
import { useBusinessSettings } from '@/services/business.services';
import { sendSms, smsFailureMessage } from '@/services/sms.services';

/**
 * "Send balance SMS": who will get one, each with their own balance, then
 * Send. One person from a card's SMS button, or everyone listed.
 */
export function BalanceSmsSheet({
  targets,
  all,
  onClose,
}: {
  /** null while closed. Only people with a phone number. */
  targets: LoanSummary[] | null;
  all: boolean;
  onClose: () => void;
}) {
  const t = useCopy(LOAN_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const business = useBusinessSettings();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<LoanSummary[]>([]);

  // Keep the last list through the closing slide, and start each opening clean.
  if (targets && targets !== shown) {
    setShown(targets);
    setError(null);
  }
  const list = targets ?? shown;
  const first = list[0];
  const who = all ? t.peopleCount(list.length) : first ? `${first.name} · ${summaryPhone(first)}` : '';

  const send = async () => {
    if (sending || list.length === 0) return;
    setSending(true);
    setError(null);
    const from = smsBusiness(business.data);
    let sent = 0;
    try {
      // One message each: every person's balance is their own.
      for (const item of list) {
        await sendSms(
          [summaryPhone(item)],
          buildLoanBalanceSms({ ...from, customerName: item.name || 'Client', principal: item.balance }),
        );
        sent += 1;
      }
      toast.show(all ? t.smsSentCount(sent) : t.smsSentTo(first?.name ?? ''));
      onClose();
    } catch (e) {
      setError(smsFailureMessage(e, sent > 0 ? t.smsSentCount(sent) : undefined));
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet open={!!targets} onClose={() => !sending && onClose()} closeLabel={t.close}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <DesignIcon name="message" size={22} color={Zinc[900]} />
        </View>
        <View style={styles.headText}>
          <Txt accessibilityRole="header" style={styles.title}>
            {t.smsTitle}
          </Txt>
          <Txt style={styles.who}>{who}</Txt>
        </View>
      </View>
      <Txt style={styles.intro}>{t.smsIntro}</Txt>
      <View style={styles.list}>
        {list.map((item, i) => {
          const side = sideOf(item.balance);
          return (
            <View key={item.key} style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.rowWho}>
                <Txt style={styles.rowName}>{item.name}</Txt>
                <Txt style={styles.rowPhone}>{summaryPhone(item)}</Txt>
              </View>
              <Txt style={[styles.rowBalance, { color: SIDE_LOOK[side].amount }]}>
                {`${money(Math.abs(item.balance))} ${t.side[side]}`}
              </Txt>
            </View>
          );
        })}
      </View>
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button
          title={sending ? t.sending : all ? t.sendTo(list.length) : t.sendSms}
          variant="pill"
          onPress={send}
          busy={sending}
          style={styles.grow}
        />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={sending} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 14, backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  who: { fontSize: 14, color: Zinc[600] },
  intro: { fontSize: 14, color: Zinc[700] },
  list: { borderRadius: 14, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  rowWho: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  rowPhone: { fontSize: 12, color: Zinc[500] },
  rowBalance: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
