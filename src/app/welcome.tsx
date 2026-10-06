import { ArrowRight, Check } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { Green, Slate, White } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';

const LOGO_DARK = require('@/assets/images/brand/logo-dark.png');

const COPY = {
  en: {
    title: 'Welcome back!',
    body: 'You are signed in securely.',
    go: 'Go to dashboard',
    back: 'Back to sign in',
  },
  bn: {
    title: 'আবার স্বাগতম!',
    body: 'নিরাপদে সাইন ইন হয়েছে।',
    go: 'ড্যাশবোর্ডে যান',
    back: 'সাইন ইন পেজে ফিরুন',
  },
};

/**
 * The last step of sign-in. Shown once per sign-in (never on app launch);
 * "Back to sign in" undoes the sign-in rather than leaving a session behind.
 */
export default function WelcomeScreen() {
  const t = useCopy(COPY);
  const { dismissWelcome, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <Image source={LOGO_DARK} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />
        <View accessibilityRole="text" style={styles.status}>
          <View style={styles.tick}>
            <Check size={38} color={Green[700]} strokeWidth={2.4} />
          </View>
          <Txt style={styles.title}>{t.title}</Txt>
          <Txt style={styles.body}>{t.body}</Txt>
        </View>
        <View style={styles.actions}>
          <Button title={t.go} onPress={dismissWelcome} trailingIcon={ArrowRight} />
          <Button title={t.back} onPress={signOut} variant="authOutline" />
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
  tick: { width: 76, height: 76, borderRadius: 999, backgroundColor: Green[100], alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  body: { fontSize: 15, color: Slate[600], textAlign: 'center' },
  actions: { gap: 10 },
});
