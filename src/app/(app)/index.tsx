import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';
import { displayName } from '@/lib/account';

// Proves the whole chain - keystore, Bearer token, /auth/me - end to end. The
// real dashboard replaces the card once its Figma screen is ready.
export default function DashboardScreen() {
  const { account } = useAuth();
  const { t, formatDateLong } = useLang();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDateLong(new Date())}</Text>
        <Text style={styles.title}>
          {t('home_welcome')}, {displayName(account)}
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>{t('home_comingSoon')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  date: { fontSize: 14, color: Colors.textSecondary },
  title: { fontSize: 24, fontWeight: '700', color: Colors.ink },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  cardText: { fontSize: 15, color: Colors.textSecondary },
});
