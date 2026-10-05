import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';

// Deliberately no "buy" button or link to the pricing page. Both stores reject
// an app that steers users to pay for a digital subscription outside their own
// billing; an app that only lets people use a plan they already have elsewhere
// is allowed. Renewal stays on the website.
export default function LockedScreen() {
  const { signOut } = useAuth();
  const { t } = useLang();
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{t('locked_title')}</Text>
      <Text style={styles.body}>{t('locked_body')}</Text>
      <Button title={t('common_signOut')} variant="secondary" onPress={signOut} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: '700', color: Colors.ink },
  body: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
});
