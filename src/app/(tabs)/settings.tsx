import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLang, type Lang } from '@/context/LanguageContext';

const LANGS: { value: Lang; label: string }[] = [
  { value: 'bn', label: 'বাংলা' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const { account, signOut } = useAuth();
  const { t, lang, setLang } = useLang();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('settings_title')}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('settings_signedInAs')}</Text>
          <Text style={styles.value}>{account?.profile?.full_name}</Text>
          <Text style={styles.secondary}>{account?.user.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('settings_language')}</Text>
          <View style={styles.segment}>
            {LANGS.map((option) => {
              const selected = option.value === lang;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setLang(option.value)}
                  style={[styles.segmentItem, selected && styles.segmentSelected]}>
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button title={t('common_signOut')} variant="danger" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: Colors.ink },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  label: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 17, fontWeight: '600', color: Colors.text },
  secondary: { fontSize: 14, color: Colors.textSecondary },
  segment: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  segmentSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  segmentText: { fontSize: 15, color: Colors.text },
  segmentTextSelected: { color: '#FFFFFF', fontWeight: '600' },
});
