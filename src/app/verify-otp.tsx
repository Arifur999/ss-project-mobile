import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { ServerTooOldError, useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';
import { errorMessage } from '@/lib/httpClient';

// The server refuses a resend inside 60 seconds; counting down here says so
// before the user taps and gets an error.
const RESEND_COOLDOWN_S = 60;

export default function VerifyOtpScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, resendOtp } = useAuth();
  const { t } = useLang();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async () => {
    if (otp.trim().length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email, otp);
    } catch (e) {
      setError(e instanceof ServerTooOldError ? t('login_serverTooOld') : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await resendOtp(email);
      setNotice(t('otp_resent'));
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('otp_title')}</Text>
          <Text style={styles.subtitle}>
            {t('otp_sentTo')} <Text style={styles.email}>{email}</Text>
          </Text>

          <TextField
            label={t('otp_placeholder')}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            onSubmitEditing={submit}
          />

          <ErrorText>{error}</ErrorText>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button
            title={busy ? t('otp_verifying') : t('otp_verify')}
            onPress={submit}
            loading={busy}
            disabled={otp.length !== 6}
          />

          <Pressable onPress={resend} disabled={cooldown > 0} style={styles.link}>
            <Text style={[styles.linkText, cooldown > 0 && styles.linkDisabled]}>
              {cooldown > 0 ? t('otp_resendIn', { s: cooldown }) : t('otp_resend')}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>{t('otp_back')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: Colors.ink },
  subtitle: { fontSize: 15, color: Colors.textSecondary },
  email: { color: Colors.text, fontWeight: '600' },
  notice: { color: Colors.success, fontSize: 14 },
  link: { alignItems: 'center', paddingVertical: Spacing.sm },
  linkText: { color: Colors.info, fontSize: 15, fontWeight: '500' },
  linkDisabled: { color: Colors.textSecondary },
});
