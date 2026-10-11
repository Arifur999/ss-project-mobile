import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { stampLabel } from '@/lib/dates';

const COPY = {
  en: {
    version: (v: string) => `Version ${v}`,
    updated: (when: string) => `Updated ${when}`,
    check: 'Check for update',
    checking: 'Checking…',
    downloading: 'Downloading…',
    latest: 'You have the latest version.',
    checkFailed: 'Could not check. Connect to the internet and try again.',
    downloadFailed: 'The new version could not be downloaded. Try again in a moment.',
    ready: 'A new version is ready. Restarting closes anything left open in any tab, so save it first.',
    restart: 'Restart now',
    restartFailed: 'Close and reopen the app to use the new version.',
  },
  bn: {
    version: (v: string) => `সংস্করণ ${v}`,
    updated: (when: string) => `আপডেট ${when}`,
    check: 'আপডেট দেখুন',
    checking: 'দেখা হচ্ছে…',
    downloading: 'নামানো হচ্ছে…',
    latest: 'আপনার অ্যাপ সর্বশেষ সংস্করণে আছে।',
    checkFailed: 'দেখা যায়নি। ইন্টারনেট চালু রেখে আবার চেষ্টা করুন।',
    downloadFailed: 'নতুন সংস্করণ নামানো যায়নি। একটু পরে আবার চেষ্টা করুন।',
    ready: 'নতুন সংস্করণ তৈরি। আবার চালু করলে যেকোনো ট্যাবে খোলা থাকা ফর্ম বন্ধ হয়ে যাবে, তাই আগে সেভ করে নিন।',
    restart: 'এখনই আবার চালু করুন',
    restartFailed: 'নতুন সংস্করণ চালু করতে অ্যাপ বন্ধ করে আবার খুলুন।',
  },
};

/**
 * The app's version and when the update it runs was published, with a way to
 * look for a newer one now rather than at the next start. A newer one is
 * downloaded and then offered, never applied on the spot: the Sales and
 * Customers tabs keep their stacks mounted under the bar, so a half-filled
 * sale can still be open behind the menu, and restarting would throw it away.
 * Each way it can fail says what went wrong. Updates are off in development
 * and Expo Go, so there is nothing to check there.
 */
export function AppVersion() {
  const t = useCopy(COPY);
  const { lang } = useLang();
  const { isUpdatePending, isDownloading } = Updates.useUpdates();
  const [busy, setBusy] = useState<'checking' | 'downloading' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const published = !Updates.isEmbeddedLaunch && Updates.createdAt ? stampLabel(Updates.createdAt.toISOString(), lang) : null;
  // The foreground check in UpdatePrompt may already be downloading one.
  const downloading = busy === 'downloading' || isDownloading;

  const check = async () => {
    if (busy || isDownloading) return;
    setNote(null);
    setBusy('checking');
    let available = false;
    try {
      available = (await Updates.checkForUpdateAsync()).isAvailable;
    } catch {
      setBusy(null);
      setNote(t.checkFailed);
      return;
    }
    if (!available) {
      setBusy(null);
      setNote(t.latest);
      return;
    }
    setBusy('downloading');
    try {
      // Once it is in, isUpdatePending turns the row into the restart offer.
      await Updates.fetchUpdateAsync();
    } catch {
      setNote(t.downloadFailed);
    } finally {
      setBusy(null);
    }
  };

  const restart = () => {
    setNote(null);
    Updates.reloadAsync().catch(() => setNote(t.restartFailed));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Txt style={styles.version}>{t.version(Constants.expoConfig?.version ?? '')}</Txt>
          {published ? <Txt style={styles.sub}>{t.updated(published)}</Txt> : null}
        </View>
        {Updates.isEnabled && !isUpdatePending ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: !!busy || isDownloading }}
            onPress={check}
            disabled={!!busy || isDownloading}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Txt style={styles.buttonText}>{busy === 'checking' ? t.checking : downloading ? t.downloading : t.check}</Txt>
          </Pressable>
        ) : null}
      </View>
      {Updates.isEnabled && isUpdatePending ? (
        <View style={styles.ready}>
          <Txt style={styles.readyText}>{t.ready}</Txt>
          <Pressable accessibilityRole="button" onPress={restart} style={({ pressed }) => [styles.restart, pressed && styles.restartPressed]}>
            <Txt style={styles.restartText}>{t.restart}</Txt>
          </Pressable>
        </View>
      ) : null}
      {note ? <Txt style={styles.sub}>{note}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 },
  version: { fontSize: 14, fontWeight: '600', color: Zinc[700] },
  sub: { fontSize: 13, color: Zinc[500] },
  button: { height: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: Zinc[300], backgroundColor: White, justifyContent: 'center' },
  pressed: { backgroundColor: Zinc[100] },
  buttonText: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  ready: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: Zinc[900] },
  readyText: { fontSize: 14, lineHeight: 20, color: White },
  restart: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: White },
  restartPressed: { backgroundColor: Zinc[200] },
  restartText: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
});
