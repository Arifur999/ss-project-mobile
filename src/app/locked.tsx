import { Clock } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { Amber, Slate, White } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';

const LOGO_DARK = require('@/assets/images/brand/logo-dark.png');

const COPY = {
  en: {
    title: 'Subscription inactive',
    body: 'Your plan is not active. Please renew from the Furnify website, then sign in again.',
    signOut: 'Back to sign in',
  },
  bn: {
    title: 'সাবস্ক্রিপশন সক্রিয় নেই',
    body: 'আপনার প্ল্যান সক্রিয় নেই। Furnify ওয়েবসাইট থেকে রিনিউ করে আবার সাইন ইন করুন।',
    signOut: 'সাইন ইন পেজে ফিরুন',
  },
};

// Drawn in the sign-in screens' style, as the Figma file has no locked screen.
//
// Deliberately no "buy" button or link to the pricing page. Both stores reject
// an app that steers users to pay for a digital subscription outside their own
// billing; an app that only lets people use a plan they already have elsewhere
// is allowed. Renewal stays on the website.
export default function LockedScreen() {
  const t = useCopy(COPY);
  const { signOut } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <Image source={LOGO_DARK} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />
        <View accessibilityRole="text" style={styles.status}>
          <View style={styles.badge}>
            <Clock size={36} color={Amber[800]} strokeWidth={2.2} />
          </View>
          <Txt style={styles.title}>{t.title}</Txt>
          <Txt style={styles.body}>{t.body}</Txt>
        </View>
        <Button title={t.signOut} variant="authOutline" onPress={signOut} />
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
  title: { marginTop: 8, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  body: { maxWidth: 330, fontSize: 15, color: Slate[600], textAlign: 'center' },
});
