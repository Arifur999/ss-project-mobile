import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { AuthHero } from '@/components/AuthHero';
import { Button } from '@/components/Button';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Slate, White } from '@/constants/theme';
import { ServerTooOldError, useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';
import { errorMessage, isUnauthorized } from '@/lib/httpClient';
import { isEmail, visibleErrors } from '@/lib/validation';

const PHOTO = require('@/assets/images/brand/auth-login.jpg');

const COPY = {
  en: {
    tagline: 'Manage your business with confidence.',
    sub: 'Sign in to track your sales, stock, accounts and customers — all in one place.',
    title: 'Sign In',
    subtitle: 'Welcome back! Please enter your details.',
    email: 'Email Address',
    emailPh: 'you@example.com',
    password: 'Password',
    passwordPh: 'Enter your password',
    forgot: 'Forgot password?',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    newOwner: 'New owner?',
    register: 'Register as owner',
    show: 'Show password',
    hide: 'Hide password',
    errEmail: 'Enter a valid email address',
    errPassword: 'Enter your password',
    wrong: 'Wrong email or password. Please try again.',
    serverTooOld: 'The server does not support the mobile app yet. Please update the backend.',
  },
  bn: {
    tagline: 'আত্মবিশ্বাসের সাথে ব্যবসা সামলান।',
    sub: 'বিক্রি, স্টক, হিসাব আর কাস্টমার — সব এক জায়গায় দেখতে সাইন ইন করুন।',
    title: 'সাইন ইন',
    subtitle: 'আবার স্বাগতম! আপনার তথ্য দিন।',
    email: 'ইমেইল',
    emailPh: 'you@example.com',
    password: 'পাসওয়ার্ড',
    passwordPh: 'পাসওয়ার্ড লিখুন',
    forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
    signIn: 'সাইন ইন করুন',
    signingIn: 'সাইন ইন হচ্ছে…',
    newOwner: 'নতুন মালিক?',
    register: 'মালিক হিসেবে রেজিস্টার করুন',
    show: 'পাসওয়ার্ড দেখুন',
    hide: 'পাসওয়ার্ড লুকান',
    errEmail: 'সঠিক ইমেইল দিন',
    errPassword: 'পাসওয়ার্ড দিন',
    wrong: 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে। আবার চেষ্টা করুন।',
    serverTooOld: 'সার্ভার এখনো মোবাইল অ্যাপ সাপোর্ট করে না। ব্যাকএন্ড আপডেট করুন।',
  },
};

type Field = 'email' | 'password';

export default function LoginScreen() {
  const t = useCopy(COPY);
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const [values, setValues] = useState<Record<Field, string>>({ email: '', password: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const all: Partial<Record<Field, string>> = {};
  if (!isEmail(values.email)) all.email = t.errEmail;
  if (!values.password) all.password = t.errPassword;
  const errors = visibleErrors(all, values, touched, submitted);

  const set = (field: Field) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setServerError(null);
  };

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    if (Object.keys(all).length > 0) return;
    setBusy(true);
    setServerError(null);
    try {
      const result = await signIn(values.email, values.password);
      // Signed straight in: the root layout's guard moves on by itself.
      if (result.kind === 'needsOtp') {
        router.push({ pathname: '/verify-otp', params: { email: result.email } });
      }
    } catch (e) {
      setServerError(
        e instanceof ServerTooOldError ? t.serverTooOld : isUnauthorized(e) ? t.wrong : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardScreen style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        <AuthHero
          photo={PHOTO}
          height={340}
          focus={[0.5, 0.75]}
          gradient={['rgba(15, 23, 42, 0.5)', 'rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.82)']}
          stops={[0, 0.35, 1]}
          tagline={t.tagline}
          sub={t.sub}
        />

        <View style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}>
          <View style={styles.heading}>
            <Txt style={styles.title}>{t.title}</Txt>
            <Txt style={styles.subtitle}>{t.subtitle}</Txt>
          </View>

          <View style={styles.form}>
            <AlertBanner tone="error">{serverError}</AlertBanner>

            <TextField
              label={t.email}
              icon={Mail}
              placeholder={t.emailPh}
              value={values.email}
              onChangeText={set('email')}
              onBlur={() => setTouched((v) => ({ ...v, email: true }))}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <View style={styles.passwordBlock}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/forgot-password')}
                hitSlop={12}
                style={styles.forgot}>
                <Txt style={styles.forgotText}>{t.forgot}</Txt>
              </Pressable>
              <TextField
                ref={passwordRef}
                label={t.password}
                icon={Lock}
                placeholder={t.passwordPh}
                value={values.password}
                onChangeText={set('password')}
                onBlur={() => setTouched((v) => ({ ...v, password: true }))}
                error={errors.password}
                password={{ show: t.show, hide: t.hide }}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </View>

            <Button
              title={busy ? t.signingIn : t.signIn}
              onPress={submit}
              busy={busy}
              style={styles.submit}
            />
          </View>

          <Txt style={styles.footer}>
            {t.newOwner}{' '}
            <Txt style={styles.footerLink} onPress={() => router.push('/register')} accessibilityRole="link">
              {t.register}
            </Txt>
          </Txt>
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: White },
  screen: { flex: 1, backgroundColor: White },
  scroll: { flexGrow: 1 },
  sheet: {
    flexGrow: 1,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: White,
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 22,
  },
  heading: { gap: 4 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900] },
  subtitle: { fontSize: 15, color: Slate[600] },
  form: { gap: 16 },
  // The link sits on the label row, right-aligned, as in the design.
  passwordBlock: { position: 'relative' },
  forgot: { position: 'absolute', right: 0, top: 0, zIndex: 2 },
  forgotText: { fontSize: 14, fontWeight: '600', color: Slate[900], lineHeight: 21 },
  submit: { marginTop: 4 },
  footer: { marginTop: 'auto', textAlign: 'center', fontSize: 15, color: Slate[600] },
  footerLink: { fontWeight: '600', color: Slate[900], textDecorationLine: 'underline' },
});
