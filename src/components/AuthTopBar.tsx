import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { LanguageToggle } from '@/components/LanguageToggle';
import { Slate } from '@/constants/theme';

/** The 64-tall bar over verification and forgot-password: back arrow, language toggle. */
export function AuthTopBar({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.back}>
        <ArrowLeft size={22} color={Slate[900]} strokeWidth={2} />
      </Pressable>
      <LanguageToggle variant="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
