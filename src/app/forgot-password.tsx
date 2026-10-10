import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { AuthTopBar } from '@/components/AuthTopBar';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { OTP_LENGTH, OtpBoxes } from '@/components/OtpBoxes';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Slate, White } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { errorMessage } from '@/lib/httpClient';
import { forgotPasswordRequest, resetPasswordRequest } from '@/services/auth.services';
import { isEmail, MIN_PASSWORD_LENGTH } from '@/lib/validation';

const COPY = {
  en: {
    back: 'Back',
    title: 'Forgot password',
    subtitle: "Enter your account email — we'll email you a reset code.",
    email: 'Email address',
    emailPh: 'you@example.com',
    send: 'Send reset code',
    sending: 'Sending…',
    errEmail: 'Enter a valid email address',
    sent: (email: string) => `A 6-digit reset code has been sent to ${email}. Check your email.`,
    backToSignIn: 'Back to sign in',
    // The reset step - not drawn in the design, built from its own parts.
    codeLabel: 'Reset code',
    newPassword: 'New password',
    newPasswordPh: 'At least 8 characters',
    confirm: 'Confirm password',
    confirmPh: 'Confirm your password',
    show: 'Show password',
    hide: 'Hide password',
    reset: 'Reset password',
    resetting: 'Resetting…',
    errCode: 'Enter the 6-digit code from your email',
    wrongCode: 'That code is incorrect. Please check your email and try again.',
    errPassword: 'Password must be at least 8 characters',
    errConfirm: "Passwords don't match",
    done: 'Password changed. Sign in with your new password.',
  },
  bn: {
    back: 'ফিরে যান',
    title: 'পাসওয়ার্ড ভুলে গেছেন',
    subtitle: 'অ্যাকাউন্টের ইমেইল দিন — আমরা ইমেইলে একটা রিসেট কোড পাঠাব।',
    email: 'ইমেইল',
    emailPh: 'you@example.com',
    send: 'রিসেট কোড পাঠান',
    sending: 'পাঠানো হচ্ছে…',
    errEmail: 'সঠিক ইমেইল দিন',
    sent: (email: string) => `${email} ঠিকানায় ৬ সংখ্যার রিসেট কোড পাঠানো হয়েছে। ইমেইল দেখুন।`,
    backToSignIn: 'সাইন ইন পেজে ফিরুন',
    codeLabel: 'রিসেট কোড',
    newPassword: 'নতুন পাসওয়ার্ড',
    newPasswordPh: 'কমপক্ষে ৮ অক্ষর',
    confirm: 'পাসওয়ার্ড নিশ্চিত করুন',
    confirmPh: 'পাসওয়ার্ড আবার লিখুন',
    show: 'পাসওয়ার্ড দেখুন',
    hide: 'পাসওয়ার্ড লুকান',
    reset: 'পাসওয়ার্ড রিসেট করুন',
    resetting: 'রিসেট হচ্ছে…',
    errCode: 'ইমেইলের ৬ সংখ্যার কোড দিন',
    wrongCode: 'কোডটা সঠিক নয়। ইমেইল দেখে আবার চেষ্টা করুন।',
    errPassword: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে',
    errConfirm: 'পাসওয়ার্ড মেলেনি',
    done: 'পাসওয়ার্ড বদলানো হয়েছে। নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন।',
  },
};

export default function ForgotPasswordScreen() {
  const t = useCopy(COPY);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetTried, setResetTried] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const bad = !isEmail(email);
  const emailError = (submitted || (touched && email)) && bad ? t.errEmail : null;

  const send = async () => {
    if (sending) return;
    setSubmitted(true);
    if (bad) return;
    setSending(true);
    setSendError(null);
    try {
      await forgotPasswordRequest(email.trim());
      setSentTo(email.trim());
    } catch (e) {
      setSendError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const codeError = resetTried && code.length !== OTP_LENGTH ? t.errCode : null;
  const passwordError = resetTried && password.length < MIN_PASSWORD_LENGTH ? t.errPassword : null;
  const confirmError = resetTried && (!confirm || confirm !== password) ? t.errConfirm : null;

  const reset = async () => {
    if (resetting) return;
    setResetTried(true);
    if (code.length !== OTP_LENGTH || password.length < MIN_PASSWORD_LENGTH || confirm !== password) return;
    setResetting(true);
    setResetError(null);
    try {
      await resetPasswordRequest(sentTo, code, password);
      setDone(true);
    } catch (e) {
      const status = isAxiosError(e) ? e.response?.status : undefined;
      setResetError(status === 400 || status === 401 ? t.wrongCode : errorMessage(e));
    } finally {
      setResetting(false);
    }
  };

  const backToSignIn = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardScreen style={styles.flex}>
        <AuthTopBar onBack={backToSignIn} backLabel={t.back} />
        <ScrollView contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <View style={styles.badge}>
              <ShieldCheck size={28} color={White} strokeWidth={1.8} />
            </View>
            <Txt style={styles.title}>{t.title}</Txt>
            <Txt style={styles.subtitle}>{t.subtitle}</Txt>
          </View>

          <View style={styles.form}>
            <TextField
              label={t.email}
              icon={Mail}
              placeholder={t.emailPh}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setSentTo('');
                setSendError(null);
              }}
              onBlur={() => setTouched(true)}
              error={emailError}
              editable={!done}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={send}
            />

            {!sentTo ? <Button title={sending ? t.sending : t.send} onPress={send} busy={sending} /> : null}

            <AlertBanner tone="error">{sendError}</AlertBanner>
            {sentTo ? <AlertBanner tone="success">{done ? t.done : t.sent(sentTo)}</AlertBanner> : null}

            {sentTo && !done ? (
              <View style={styles.form}>
                <View style={styles.codeBlock}>
                  <Txt style={styles.label}>{t.codeLabel}</Txt>
                  <OtpBoxes
                    value={code}
                    onChange={(next) => {
                      setCode(next);
                      setResetError(null);
                    }}
                    error={!!resetError || !!codeError}
                    disabled={resetting}
                    label={t.codeLabel}
                  />
                  <FieldError>{codeError ?? resetError}</FieldError>
                </View>
                <TextField
                  label={t.newPassword}
                  icon={Lock}
                  placeholder={t.newPasswordPh}
                  value={password}
                  onChangeText={setPassword}
                  error={passwordError}
                  password={{ show: t.show, hide: t.hide }}
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                <TextField
                  label={t.confirm}
                  icon={Lock}
                  placeholder={t.confirmPh}
                  value={confirm}
                  onChangeText={setConfirm}
                  error={confirmError}
                  password={{ show: t.show, hide: t.hide }}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  onSubmitEditing={reset}
                />
                <Button title={resetting ? t.resetting : t.reset} onPress={reset} busy={resetting} />
              </View>
            ) : null}
          </View>

          <Pressable accessibilityRole="link" onPress={backToSignIn} style={styles.backLink}>
            <Txt style={styles.backLinkText}>{t.backToSignIn}</Txt>
          </Pressable>
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  main: { flexGrow: 1, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28, gap: 24 },
  intro: { alignItems: 'center', gap: 12 },
  badge: { width: 64, height: 64, borderRadius: 18, backgroundColor: Slate[900], alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  subtitle: { maxWidth: 320, fontSize: 15, color: Slate[600], textAlign: 'center' },
  form: { gap: 16 },
  codeBlock: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Slate[900] },
  backLink: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  backLinkText: { fontSize: 15, fontWeight: '600', color: Slate[900] },
});
