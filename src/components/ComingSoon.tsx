import { Hourglass } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';

const COPY = {
  en: {
    back: 'Back',
    title: 'Coming soon to the app',
    body: 'This section is being designed for mobile. Until then it is available on the Furnify website.',
  },
  bn: {
    back: 'ফিরে যান',
    title: 'শীঘ্রই অ্যাপে আসছে',
    body: 'এই অংশটা মোবাইলের জন্য ডিজাইন করা হচ্ছে। ততদিন Furnify ওয়েবসাইটে ব্যবহার করুন।',
  },
};

/**
 * Stands in for every screen the Figma file does not draw yet (Sales,
 * Inventory, most of the More menu), in the in-app style, so each menu item
 * goes somewhere honest instead of nowhere.
 */
export function ComingSoon({ title, onBack }: { title: string; onBack?: () => void }) {
  const t = useCopy(COPY);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {onBack ? <ScreenHeader title={title} onBack={onBack} backLabel={t.back} /> : <Txt style={styles.tabTitle}>{title}</Txt>}
      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Hourglass size={26} color={Zinc[600]} strokeWidth={1.8} />
          </View>
          <Txt style={styles.heading}>{t.title}</Txt>
          <Txt style={styles.text}>{t.body}</Txt>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  tabTitle: { paddingTop: 14, paddingHorizontal: 20, fontSize: 22, fontWeight: '700', letterSpacing: -0.22, color: Zinc[900], lineHeight: 30 },
  body: { flex: 1, padding: 20 },
  card: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Zinc[300],
  },
  badge: { width: 56, height: 56, borderRadius: 999, backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 17, fontWeight: '600', color: Zinc[900], textAlign: 'center' },
  text: { maxWidth: 300, fontSize: 15, color: Zinc[600], textAlign: 'center' },
});
