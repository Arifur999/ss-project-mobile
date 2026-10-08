import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { PromptCard } from '@/components/PromptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';
import { WEBSITE_URL } from '@/lib/config';
import { errorMessage } from '@/lib/httpClient';
import { createTicket, useTicketWrite } from '@/services/support.services';

const COPY = {
  en: {
    title: 'Delete account',
    back: 'Back to menu',
    close: 'Close',
    cancel: 'Cancel',
    intro: 'You can ask for your Furnify account and its data to be deleted. Support checks the request is yours, then deletes it.',
    ownerTitle: 'You are the owner',
    owner: 'The whole business is deleted: every record - products, stock, purchases, sales, customers, suppliers, accounts, expenses, loans, employees - and every team member\'s login.',
    memberTitle: 'You are a team member',
    member: 'Only your login is deleted. The business records belong to the owner and stay with them.',
    points: [
      'It cannot be undone. Download any reports you want to keep first.',
      'It is done within 30 days of support confirming it with you.',
    ],
    request: 'Request deletion',
    confirmTitle: 'Ask for your account to be deleted?',
    confirmText: 'Support will confirm with you, then delete it. This cannot be undone once done.',
    sent: 'Your request has been sent to support. They will confirm with you before anything is deleted.',
    openTicket: 'Open the request',
    readMore: 'Read how deletion works',
    subject: 'Delete my account',
    message: (email: string, role: string) =>
      `Please delete my Furnify account and its data.\nEmail: ${email}\nRole: ${role}\nSent from the Android app's Delete account screen.`,
  },
  bn: {
    title: 'অ্যাকাউন্ট মুছুন',
    back: 'মেনুতে ফিরুন',
    close: 'বন্ধ করুন',
    cancel: 'বাতিল',
    intro: 'আপনার Furnify অ্যাকাউন্ট আর তার তথ্য মুছে ফেলার অনুরোধ করতে পারেন। সাপোর্ট নিশ্চিত হবে অনুরোধটি আপনার, তারপর মুছে ফেলবে।',
    ownerTitle: 'আপনি মালিক',
    owner: 'পুরো ব্যবসা মুছে যাবে: সব হিসাব - পণ্য, স্টক, কেনা, বিক্রি, কাস্টমার, সাপ্লায়ার, অ্যাকাউন্ট, খরচ, লোন, কর্মচারী - আর টিমের সবার লগইন।',
    memberTitle: 'আপনি টিমের সদস্য',
    member: 'শুধু আপনার লগইন মুছে যাবে। ব্যবসার হিসাব মালিকের, তা মালিকের কাছেই থাকবে।',
    points: ['মুছে ফেলা আর ফেরত আনা যায় না। যে রিপোর্ট রাখতে চান, আগে নামিয়ে রাখুন।', 'সাপোর্ট আপনার সাথে নিশ্চিত হওয়ার ৩০ দিনের মধ্যে মুছে ফেলা হয়।'],
    request: 'মুছে ফেলার অনুরোধ করুন',
    confirmTitle: 'অ্যাকাউন্ট মুছে ফেলার অনুরোধ করবেন?',
    confirmText: 'সাপোর্ট আপনার সাথে নিশ্চিত হয়ে তারপর মুছে ফেলবে। মুছে ফেলার পর আর ফেরত আনা যায় না।',
    sent: 'আপনার অনুরোধ সাপোর্টে পাঠানো হয়েছে। কিছু মোছার আগে তারা আপনার সাথে নিশ্চিত হবে।',
    openTicket: 'অনুরোধটি দেখুন',
    readMore: 'মুছে ফেলা কীভাবে হয় পড়ুন',
    subject: 'Delete my account',
    message: (email: string, role: string) =>
      `Please delete my Furnify account and its data.\nEmail: ${email}\nRole: ${role}\nSent from the Android app's Delete account screen.`,
  },
};

/**
 * Asking for the account to be deleted - what the Play Store requires inside
 * the app: what goes (an owner's whole business, a team member's login), that
 * it cannot be undone and within how long, then the request itself, sent to
 * support as a ticket so they can confirm it is the account holder's before
 * anything is deleted. The same steps the website's account deletion page
 * gives, which is linked here too.
 */
export default function DeleteAccountScreen() {
  const t = useCopy(COPY);
  const { account } = useAuth();
  const put = useTicketWrite();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const owner = account?.profile?.role === 'owner';

  const send = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const ticket = await createTicket({ subject: t.subject, message: t.message(String(account?.user.email || ''), String(account?.profile?.role || '')) });
      put(ticket);
      setTicketId(ticket.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t.title} onBack={() => router.navigate('/more')} backLabel={t.back} />
      <ScrollView contentContainerStyle={styles.body}>
        {ticketId ? (
          <>
            <PromptCard icon="check" text={t.sent} />
            <Button title={t.openTicket} variant="pillOutline" onPress={() => router.push({ pathname: '/more/support/[id]', params: { id: ticketId } })} />
          </>
        ) : (
          <>
            <Txt style={styles.intro}>{t.intro}</Txt>
            <View style={styles.card}>
              <Txt style={styles.cardTitle}>{owner ? t.ownerTitle : t.memberTitle}</Txt>
              <Txt style={styles.cardText}>{owner ? t.owner : t.member}</Txt>
            </View>
            {t.points.map((point) => (
              <View key={point} style={styles.point}>
                <DesignIcon name="info" size={16} color={Zinc[600]} strokeWidth={2} />
                <Txt style={styles.pointText}>{point}</Txt>
              </View>
            ))}
            <AlertBanner tone="error">{error}</AlertBanner>
            <Button title={t.request} icon="trash" variant="danger" onPress={() => setConfirming(true)} busy={sending} />
          </>
        )}
        <Button title={t.readMore} variant="pillOutline" onPress={() => Linking.openURL(`${WEBSITE_URL}/account-deletion`).catch(() => {})} />
      </ScrollView>

      <ConfirmDeleteSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.confirmTitle}
        text={t.confirmText}
        cancelLabel={t.cancel}
        deleteLabel={t.request}
        closeLabel={t.close}
        busy={sending}
        onConfirm={send}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  body: { padding: 20, gap: 14 },
  intro: { fontSize: 15, lineHeight: 22, color: Zinc[700] },
  card: { gap: 4, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Red[200], backgroundColor: Red[50] },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Red[800] },
  cardText: { fontSize: 14, lineHeight: 20, color: Red[900] },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 20, color: Zinc[700] },
});
