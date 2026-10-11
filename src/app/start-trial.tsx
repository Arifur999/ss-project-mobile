import { isAxiosError } from 'axios';
import { Check, Gift } from 'lucide-react-native';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Green, Slate, White } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OWNER_DETAILS_COPY, ownerDetailErrors, ownerDetailField, type OwnerDetail } from '@/features/auth/ownerDetails';
import { errorMessage } from '@/lib/httpClient';
import { normalizePhone, visibleErrors } from '@/lib/validation';
import { startFreeTrial } from '@/services/billing.services';

const LOGO_DARK = require('@/assets/images/brand/logo-dark.png');

const COPY = {
  en: {
    ...OWNER_DETAILS_COPY.en,
    title: 'Start your free trial',
    sub: (business: string) => `Use Furnify for ${business || 'your business'} free for 7 days. No payment is needed.`,
    includedTitle: "What's included",
    // The website's free-trial card (Hatim/src/lib/planFeatures.ts), word for word.
    included: ['Full software access', '10 free SMS, once', 'All reports & analytics', 'Valid for 7 days'],
    detailsTitle: 'Your details',
    detailsHint: 'So our team can help you get started.',
    start: 'Start 7-day free trial',
    starting: 'Starting…',
    started: 'Your 7-day free trial has started',
    unavailable: "The free trial can't be started on this account. Contact support if this looks wrong.",
    signOut: 'Back to sign in',
  },
  bn: {
    ...OWNER_DETAILS_COPY.bn,
    title: 'ফ্রি ট্রায়াল শুরু করুন',
    sub: (business: string) => `${business || 'আপনার ব্যবসা'}-র জন্য ৭ দিন ফ্রিতে Furnify ব্যবহার করুন। কোনো পেমেন্ট লাগবে না।`,
    includedTitle: 'যা থাকছে',
    included: ['সম্পূর্ণ সফটওয়্যার অ্যাক্সেস', '১০টি ফ্রি এসএমএস, একবার', 'সব রিপোর্ট ও অ্যানালিটিক্স', '৭ দিনের জন্য'],
    detailsTitle: 'আপনার তথ্য',
    detailsHint: 'যাতে আমাদের টিম শুরু করতে সাহায্য করতে পারে।',
    start: '৭ দিনের ফ্রি ট্রায়াল শুরু করুন',
    starting: 'শুরু হচ্ছে…',
    started: 'আপনার ৭ দিনের ফ্রি ট্রায়াল শুরু হয়েছে',
    unavailable: 'এই অ্যাকাউন্টে ফ্রি ট্রায়াল শুরু করা যাচ্ছে না। ভুল মনে হলে সাপোর্টে যোগাযোগ করুন।',
    signOut: 'সাইন ইন পেজে ফিরুন',
  },
};

/**
 * Where a new owner lands after signing in: their workspace has no plan yet,
 * and the 7-day free trial is theirs to start - what the website's
 * /choose-plan offers through its free-trial card and popup, with the same
 * three details (filled from the registration) sent with it.
 *
 * The subscription choose-plan answers with is applied at once, so the root
 * layout's guard moves into the app even if re-reading the account then fails.
 * A refusal re-reads the account - the trial may already be running, started
 * on the website or by a request whose answer was lost - and is put in the
 * app's own words: the server's 403 names the paid plans.
 *
 * Only the free trial is offered. A paid plan is a digital subscription, and
 * the app stores allow selling one only through their own billing, so the app
 * neither sells nor prices one, nor points anywhere that does.
 */
export default function StartTrialScreen() {
  const t = useCopy(COPY);
  const { account, refreshAccount, applySubscription, dismissWelcome, signOut } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState<Record<OwnerDetail, string>>(() => ({
    name: account?.profile?.full_name ?? '',
    phone: account?.profile?.phone ?? '',
    address: account?.subscription?.address ?? '',
  }));
  const [touched, setTouched] = useState<Partial<Record<OwnerDetail, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const all = ownerDetailErrors(values, t);
  const errors = visibleErrors(all, values, touched, submitted);

  const field = (key: OwnerDetail) => ({
    ...ownerDetailField(key, t),
    value: values[key],
    onChangeText: (text: string) => {
      setValues((v) => ({ ...v, [key]: text }));
      setServerError(null);
    },
    onBlur: () => setTouched((v) => ({ ...v, [key]: true })),
    error: errors[key],
  });

  const start = async () => {
    if (busy) return;
    setSubmitted(true);
    if (Object.keys(all).length > 0) return;
    setBusy(true);
    setServerError(null);
    try {
      const subscription = await startFreeTrial({
        full_name: values.name.trim(),
        phone: normalizePhone(values.phone),
        address: values.address.trim(),
      });
      // Straight into the app: no "Welcome back!" for an owner who just began.
      dismissWelcome();
      applySubscription(subscription);
      toast.show(t.started);
      refreshAccount();
    } catch (e) {
      setServerError(isAxiosError(e) && e.response?.status === 403 ? t.unavailable : errorMessage(e));
      // Whatever the account now is - a trial already running moves the guard on.
      await refreshAccount();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardScreen style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Image source={LOGO_DARK} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />

          <View style={styles.head}>
            <View style={styles.badge}>
              <Gift size={30} color={Green[700]} strokeWidth={2.2} />
            </View>
            <Txt accessibilityRole="header" style={styles.title}>
              {t.title}
            </Txt>
            <Txt style={styles.sub}>{t.sub(account?.subscription?.business_name ?? '')}</Txt>
          </View>

          <View style={styles.card}>
            <Txt style={styles.cardTitle}>{t.includedTitle}</Txt>
            {t.included.map((line) => (
              <View key={line} style={styles.point}>
                <Check size={18} color={Green[600]} strokeWidth={2.6} />
                <Txt style={styles.pointText}>{line}</Txt>
              </View>
            ))}
          </View>

          <View style={styles.form}>
            <View style={styles.formHead}>
              <Txt style={styles.cardTitle}>{t.detailsTitle}</Txt>
              <Txt style={styles.hint}>{t.detailsHint}</Txt>
            </View>
            <TextField {...field('name')} />
            <TextField {...field('phone')} />
            <TextField {...field('address')} />
            <AlertBanner tone="error">{serverError}</AlertBanner>
            <Button title={busy ? t.starting : t.start} onPress={start} busy={busy} />
            <Button title={t.signOut} variant="authOutline" onPress={signOut} disabled={busy} />
          </View>
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 22 },
  logo: { width: 92, height: 36 },
  head: { alignItems: 'center', gap: 10 },
  badge: { width: 68, height: 68, borderRadius: 999, backgroundColor: Green[100], alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  sub: { maxWidth: 340, fontSize: 15, lineHeight: 22, color: Slate[600], textAlign: 'center' },
  card: { gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Slate[200], backgroundColor: Slate[50] },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Slate[900] },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointText: { flex: 1, fontSize: 15, color: Slate[700] },
  form: { gap: 16 },
  formHead: { gap: 2 },
  hint: { fontSize: 14, color: Slate[600] },
});
