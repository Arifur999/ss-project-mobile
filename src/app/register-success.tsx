import { router, useLocalSearchParams } from 'expo-router';
import { Check, Clock } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { Amber, Green, Slate, White } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';

const LOGO_DARK = require('@/assets/images/brand/logo-dark.png');

const COPY = {
  en: {
    title: 'Request submitted',
    body: (name: string, business: string) =>
      `Thanks, ${name}. We have received the registration request for ${business}. You can sign in once your workspace is approved.`,
    summary: 'Your details',
    pending: 'Pending approval',
    business: 'Business',
    phone: 'Phone',
    email: 'Email',
    back: 'Back to sign in',
  },
  bn: {
    title: 'অনুরোধ পাঠানো হয়েছে',
    body: (name: string, business: string) =>
      `ধন্যবাদ, ${name}। ${business} এর রেজিস্ট্রেশনের অনুরোধ আমরা পেয়েছি। ওয়ার্কস্পেস অনুমোদন হলে সাইন ইন করতে পারবেন।`,
    summary: 'আপনার দেওয়া তথ্য',
    pending: 'অনুমোদনের অপেক্ষায়',
    business: 'ব্যবসা',
    phone: 'মোবাইল',
    email: 'ইমেইল',
    back: 'সাইন ইন পেজে ফিরুন',
  },
};

/** The end of registration: what was submitted, and the way back to sign in. */
export default function RegisterSuccessScreen() {
  const t = useCopy(COPY);
  const { name = '', business = '', phone = '', email = '' } =
    useLocalSearchParams<{ name: string; business: string; phone: string; email: string }>();

  const rows = [
    [t.business, business],
    [t.phone, phone],
    [t.email, email],
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Image source={LOGO_DARK} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />

        <View accessibilityRole="text" style={styles.status}>
          <View style={styles.tick}>
            <Check size={38} color={Green[700]} strokeWidth={2.4} />
          </View>
          <Txt style={styles.title}>{t.title}</Txt>
          <Txt style={styles.body}>{t.body(name, business)}</Txt>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Txt style={styles.cardTitle}>{t.summary}</Txt>
            <View style={styles.badge}>
              <Clock size={14} color={Amber[800]} strokeWidth={2.2} />
              <Txt style={styles.badgeText}>{t.pending}</Txt>
            </View>
          </View>
          <View style={styles.rows}>
            {rows.map(([label, value], i) => (
              <View key={label} style={[styles.row, i < rows.length - 1 && styles.rowDivider]}>
                <Txt style={styles.dt}>{label}</Txt>
                <Txt style={styles.dd}>{value}</Txt>
              </View>
            ))}
          </View>
        </View>

        <Button title={t.back} onPress={() => router.dismissTo('/login')} style={styles.back} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { flexGrow: 1, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 28 },
  logo: { width: 92, height: 36 },
  status: { alignItems: 'center', gap: 12, paddingTop: 36 },
  tick: { width: 76, height: 76, borderRadius: 999, backgroundColor: Green[100], alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  body: { maxWidth: 330, fontSize: 15, color: Slate[600], textAlign: 'center' },
  card: { borderWidth: 1, borderColor: Slate[200], borderRadius: 16, overflow: 'hidden' },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Slate[50],
    borderBottomWidth: 1,
    borderBottomColor: Slate[200],
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Slate[900] },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: Amber[100] },
  badgeText: { fontSize: 13, fontWeight: '600', color: Amber[800], lineHeight: 18 },
  rows: { paddingVertical: 4, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Slate[100] },
  dt: { fontSize: 14, color: Slate[600] },
  dd: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: Slate[900], textAlign: 'right' },
  // The design's link-styled button carries no shadow, unlike the form buttons.
  back: { marginTop: 'auto', shadowOpacity: 0, elevation: 0 },
});
