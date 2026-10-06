import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { FONT_FILES } from '@/constants/fonts';
import { Colors, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
import { isSubscriptionLocked } from '@/lib/account';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Mobile networks drop and recover; retry twice before showing an error, and
  // never retry a 4xx, which a second try will not change.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error: any) => count < 2 && !(error?.response?.status >= 400 && error?.response?.status < 500),
          },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, account } = useAuth();
  // A font that fails to load must not hold the app on the splash screen; the
  // text falls back to the system face instead.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const ready = status !== 'loading' && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (status === 'offline') return <OfflineScreen />;

  const signedIn = status === 'signedIn';
  const locked = signedIn && isSubscriptionLocked(account);

  // Stack.Protected is the route guard: a screen whose guard is false cannot be
  // navigated to, and expo-router sends the user to the first allowed one.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && !locked}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={locked}>
        <Stack.Screen name="locked" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="verify-otp" />
      </Stack.Protected>
    </Stack>
  );
}

function OfflineScreen() {
  const { refreshAccount } = useAuth();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{t('boot_offline')}</Text>
      <Button
        title={t('boot_retry')}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await refreshAccount();
          setBusy(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.background },
  message: { fontSize: 16, color: Colors.text, textAlign: 'center' },
});
