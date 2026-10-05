import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { ServerTooOldError, useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';
import { errorMessage } from '@/lib/httpClient';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(t('login_fillAll'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      // Signed in: the root layout's guard swaps to the tabs on its own.
      if (result.kind === 'needsOtp') {
        router.push({ pathname: '/verify-otp', params: { email: result.email } });
      }
    } catch (e) {
      setError(e instanceof ServerTooOldError ? t('login_serverTooOld') : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>Furnify</Text>
            <Text style={styles.title}>{t('login_title')}</Text>
          </View>

          <TextField
            label={t('login_emailAddress')}
            placeholder={t('login_emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label={t('login_password')}
            placeholder={t('login_passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <ErrorText>{error}</ErrorText>
          <Button title={busy ? t('login_signingIn') : t('login_title')} onPress={submit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  header: { marginBottom: Spacing.lg, gap: Spacing.xs },
  brand: { fontSize: 32, fontWeight: '700', color: Colors.ink },
  title: { fontSize: 18, color: Colors.textSecondary },
});
