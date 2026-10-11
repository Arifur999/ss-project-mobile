import { Ban, Clock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Image, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { Amber, Red, Slate, White } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';
import { effectiveSubscriptionStatus } from '@/lib/account';
import { whatsAppLink } from '@/lib/support';
import { useSupportNumber } from '@/services/support.services';

const LOGO_DARK = require('@/assets/images/brand/logo-dark.png');

type Lock = 'expired' | 'pending' | 'blocked' | 'suspended' | 'none';

const COPY = {
  en: {
    locks: {
      expired: { title: 'Subscription inactive', body: "Your plan isn't active, so this workspace is closed for now. Your records are kept safe." },
      pending: { title: 'Waiting for approval', body: 'App access starts once the super admin approves your account.' },
      blocked: { title: 'Account blocked', body: 'Your owner account is currently blocked. Please contact the super admin to restore access.' },
      suspended: { title: 'Account suspended', body: 'Your owner account is currently suspended. Please contact administration to restore access.' },
      none: { title: 'Account not ready', body: 'Your owner account setup is not complete yet. Please contact the super admin.' },
    },
    recheck: 'Check again',
    support: 'Contact support on WhatsApp',
    signOut: 'Back to sign in',
  },
  bn: {
    locks: {
      expired: { title: 'সাবস্ক্রিপশন সক্রিয় নেই', body: 'আপনার প্ল্যান সক্রিয় নেই, তাই ওয়ার্কস্পেস আপাতত বন্ধ। আপনার সব হিসাব নিরাপদে আছে।' },
      pending: { title: 'অনুমোদনের অপেক্ষায়', body: 'সুপার অ্যাডমিন আপনার অ্যাকাউন্ট অনুমোদন করলে অ্যাপ ব্যবহার শুরু করতে পারবেন।' },
      blocked: { title: 'অ্যাকাউন্ট ব্লক করা হয়েছে', body: 'আপনার মালিক অ্যাকাউন্ট এখন ব্লক করা আছে। আবার চালু করতে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।' },
      suspended: { title: 'অ্যাকাউন্ট স্থগিত', body: 'আপনার মালিক অ্যাকাউন্ট এখন স্থগিত আছে। আবার চালু করতে কর্তৃপক্ষের সাথে যোগাযোগ করুন।' },
      none: { title: 'অ্যাকাউন্ট এখনো প্রস্তুত নয়', body: 'আপনার মালিক অ্যাকাউন্টের সেটআপ এখনো শেষ হয়নি। সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।' },
    },
    recheck: 'আবার দেখুন',
    support: 'WhatsApp-এ সাপোর্টে যোগাযোগ করুন',
    signOut: 'সাইন ইন পেজে ফিরুন',
  },
};

// Drawn in the sign-in screens' style, as the Figma file has no locked screen.
//
// Says why, as the website's lock does (App.tsx ProtectedRoute): waiting for
// approval, blocked or suspended by the super admin - with their reason - or a
// plan that is no longer active. An owner who may still start the free trial
// never lands here (start-trial).
//
// Deliberately no "buy" button, price, or word on where a plan is bought - not
// even "renew on the website". Both stores reject an app that steers users to
// pay for a digital subscription outside their own billing; an app that only
// lets people use a plan they already have is allowed. Support stays reachable:
// asking for help is not a purchase.
//
// The account is read again on Check again and whenever the app comes back to
// the front, so an approval or a renewal made meanwhile lets the owner in
// without signing out.
export default function LockedScreen() {
  const t = useCopy(COPY);
  const { account, refreshAccount, signOut } = useAuth();
  const supportNumber = useSupportNumber();
  const [checking, setChecking] = useState(false);

  const status = effectiveSubscriptionStatus(account?.subscription ?? null);
  const lock: Lock = status === 'pending' || status === 'blocked' || status === 'suspended' || status === 'none' ? status : 'expired';
  const barred = lock === 'blocked' || lock === 'suspended';
  const reason = String(account?.subscription?.blocked_reason ?? '').trim();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAccount();
    });
    return () => sub.remove();
  }, [refreshAccount]);

  const recheck = async () => {
    if (checking) return;
    setChecking(true);
    await refreshAccount();
    setChecking(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <Image source={LOGO_DARK} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />
        <View accessibilityRole="text" style={styles.status}>
          <View style={[styles.badge, barred && styles.badgeBarred]}>
            {barred ? <Ban size={34} color={Red[700]} strokeWidth={2.2} /> : <Clock size={36} color={Amber[800]} strokeWidth={2.2} />}
          </View>
          <Txt style={styles.title}>{t.locks[lock].title}</Txt>
          <Txt style={styles.body}>{t.locks[lock].body}</Txt>
          {reason ? <Txt style={styles.reason}>{reason}</Txt> : null}
        </View>
        <View style={styles.actions}>
          <Button title={t.recheck} onPress={recheck} busy={checking} />
          <Button title={t.support} icon="message" variant="authOutline" onPress={() => Linking.openURL(whatsAppLink(supportNumber)).catch(() => {})} />
          <Button title={t.signOut} variant="authOutline" onPress={signOut} disabled={checking} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { flex: 1, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32 },
  logo: { width: 92, height: 36 },
  status: { marginVertical: 'auto', alignItems: 'center', gap: 12 },
  badge: { width: 76, height: 76, borderRadius: 999, backgroundColor: Amber[100], alignItems: 'center', justifyContent: 'center' },
  badgeBarred: { backgroundColor: Red[50] },
  title: { marginTop: 8, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  body: { maxWidth: 330, fontSize: 15, color: Slate[600], textAlign: 'center' },
  reason: { maxWidth: 330, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Red[50], fontSize: 13, fontWeight: '500', color: Red[700], textAlign: 'center' },
  actions: { gap: 12 },
});
