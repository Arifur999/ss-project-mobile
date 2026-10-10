import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Green, White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';

const COPY = {
  en: {
    title: 'A new version is ready',
    text: 'Restart the app to use it. Anything not yet saved will be lost.',
    later: 'Later',
    restart: 'Restart',
  },
  bn: {
    title: 'নতুন সংস্করণ তৈরি',
    text: 'ব্যবহার করতে অ্যাপ আবার চালু করুন। সেভ না করা কিছু থাকলে তা মুছে যাবে।',
    later: 'পরে',
    restart: 'আবার চালু করুন',
  },
};

/** Coming back to the app looks for an update at most this often. */
const CHECK_EVERY_MS = 30 * 60_000;

/**
 * Offers an EAS Update once it has downloaded. expo-updates fetches one on a
 * cold start but runs it only on the next, and a shop's phone keeps the app
 * open for days - so it is also looked for when the app comes back to the
 * front (at most every half hour), and once one is waiting the user is asked
 * to restart into it. Later leaves it for the next start, so a half-filled
 * form is never thrown away without asking. Nothing shows in development or
 * Expo Go, where updates are off.
 */
export function UpdatePrompt() {
  const t = useCopy(COPY);
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    // The launch itself has just checked.
    lastCheck.current = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      Updates.checkForUpdateAsync()
        .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  if (!Updates.isEnabled || !isUpdatePending || dismissed) return null;

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.card, { top: insets.top + 8 }]}>
      <View style={styles.icon}>
        <DesignIcon name="download" size={16} color={White} strokeWidth={2.4} />
      </View>
      <View style={styles.body}>
        <Txt style={styles.title}>{t.title}</Txt>
        <Txt style={styles.text}>{t.text}</Txt>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => setDismissed(true)} hitSlop={6} style={styles.later}>
            <Txt style={styles.laterText}>{t.later}</Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => Updates.reloadAsync().catch(() => {})}
            style={({ pressed }) => [styles.restart, pressed && styles.restartPressed]}>
            <Txt style={styles.restartText}>{t.restart}</Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Zinc[900],
    shadowColor: Zinc[950],
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  icon: { width: 28, height: 28, borderRadius: 999, backgroundColor: Green[500], alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600', color: White },
  text: { fontSize: 13, lineHeight: 18, color: Zinc[300] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 },
  later: { paddingVertical: 8, paddingHorizontal: 12 },
  laterText: { fontSize: 14, fontWeight: '600', color: Zinc[300] },
  restart: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: White },
  restartPressed: { backgroundColor: Zinc[200] },
  restartText: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
});
