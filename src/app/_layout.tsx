import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { FONT_FILES } from '@/constants/fonts';
import { White, Zinc } from '@/constants/theme';
import { AmountShieldProvider } from '@/context/AmountShieldContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider, useCopy } from '@/context/LanguageContext';
import { ToastProvider } from '@/context/ToastContext';
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
          <AmountShieldProvider>
            <AuthProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <RootNavigator />
              </ToastProvider>
            </AuthProvider>
          </AmountShieldProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, account, welcome } = useAuth();
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
  const greeting = signedIn && welcome;
  const locked = signedIn && !welcome && isSubscriptionLocked(account);
  const inside = signedIn && !welcome && !locked;

  // Stack.Protected is the route guard: a screen whose guard is false cannot be
  // navigated to, and expo-router sends the user to the first allowed one. So
  // signing in lands on "Welcome back!", dismissing it lands inside the app (or
  // on the locked screen), and signing out lands on sign-in - no navigate calls.
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Protected guard={inside}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="soon" />
      </Stack.Protected>
      <Stack.Protected guard={greeting}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={locked}>
        <Stack.Screen name="locked" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="verify-otp" />
        <Stack.Screen name="register" />
        <Stack.Screen name="register-verify" />
        <Stack.Screen name="register-success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
    </Stack>
  );
}

const OFFLINE_COPY = {
  en: { message: 'Could not reach the server.', retry: 'Try again' },
  bn: { message: 'সার্ভারের সাথে সংযোগ করা যায়নি।', retry: 'আবার চেষ্টা করুন' },
};

function OfflineScreen() {
  const { refreshAccount } = useAuth();
  const t = useCopy(OFFLINE_COPY);
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.center}>
      <Txt style={styles.message}>{t.message}</Txt>
      <Button
        title={t.retry}
        variant="pill"
        busy={busy}
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
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: White },
  message: { fontSize: 16, color: Zinc[900], textAlign: 'center' },
});
