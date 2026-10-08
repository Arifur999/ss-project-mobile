import { StyleSheet, View } from 'react-native';

import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';

const COPY = {
  en: { loading: 'Loading…' },
  bn: { loading: 'লোড হচ্ছে…' },
};

/**
 * A screen or section still loading: the spinner in the middle of its space,
 * the word under it - never pinned to one side, whatever the space around it
 * lays out its other states like. `fill` takes the screen's whole height; else
 * it holds `minHeight`, so the page does not jump when the content arrives.
 */
export function LoadingState({ fill = false, minHeight = 240 }: { fill?: boolean; minHeight?: number }) {
  const t = useCopy(COPY);
  return (
    <View accessible accessibilityLabel={t.loading} style={[styles.box, fill ? styles.fill : { minHeight }]}>
      <Spinner color={Zinc[900]} size={28} />
      <Txt style={styles.label}>{t.loading}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  fill: { flex: 1 },
  label: { fontSize: 13, color: Zinc[500] },
});
