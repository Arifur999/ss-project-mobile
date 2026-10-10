import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { dateLabel, timeLabel, toISODate } from '@/lib/dates';

const COPY = {
  en: {
    version: (v: string) => `Version ${v}`,
    updated: (when: string) => `Updated ${when}`,
    check: 'Check for update',
    checking: 'Checking…',
    latest: 'You have the latest version.',
    failed: 'Could not check. Connect to the internet and try again.',
  },
  bn: {
    version: (v: string) => `সংস্করণ ${v}`,
    updated: (when: string) => `আপডেট ${when}`,
    check: 'আপডেট দেখুন',
    checking: 'দেখা হচ্ছে…',
    latest: 'আপনার অ্যাপ সর্বশেষ সংস্করণে আছে।',
    failed: 'দেখা যায়নি। ইন্টারনেট চালু রেখে আবার চেষ্টা করুন।',
  },
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * The app's version and when the update it runs was published, with a way to
 * look for a newer one now rather than at the next start. One found is
 * downloaded and the app restarts into it at once - asked for here, on the
 * menu, where no form is half filled. Updates are off in development and
 * Expo Go, so there is nothing to check there.
 */
export function AppVersion() {
  const t = useCopy(COPY);
  const { lang } = useLang();
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const published = !Updates.isEmbeddedLaunch && Updates.createdAt ? Updates.createdAt : null;
  const when = published
    ? `${dateLabel(toISODate(published), lang)}, ${timeLabel(`${pad2(published.getHours())}:${pad2(published.getMinutes())}`, lang)}`
    : null;

  const check = async () => {
    if (checking) return;
    setChecking(true);
    setNote(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setNote(t.latest);
        return;
      }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setNote(t.failed);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Txt style={styles.version}>{t.version(Constants.expoConfig?.version ?? '')}</Txt>
          {when ? <Txt style={styles.sub}>{t.updated(when)}</Txt> : null}
        </View>
        {Updates.isEnabled ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: checking }}
            onPress={check}
            disabled={checking}
            style={({ pressed }) => [styles.check, pressed && styles.pressed]}>
            <Txt style={styles.checkText}>{checking ? t.checking : t.check}</Txt>
          </Pressable>
        ) : null}
      </View>
      {note ? <Txt style={styles.sub}>{note}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 },
  version: { fontSize: 14, fontWeight: '600', color: Zinc[700] },
  sub: { fontSize: 13, color: Zinc[500] },
  check: { height: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: Zinc[300], backgroundColor: White, justifyContent: 'center' },
  pressed: { backgroundColor: Zinc[100] },
  checkText: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
});
