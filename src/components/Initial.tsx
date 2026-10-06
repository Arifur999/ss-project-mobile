import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/**
 * A name's first letter in a circle - the account button (36, black), the
 * account sheet (52), the menu's profile card (48, white on black) and each
 * customer row (36, grey).
 */
type Tone = 'dark' | 'light' | 'muted';

const TONES = {
  dark: { bg: Zinc[900], ink: White, weight: '700' as const },
  light: { bg: White, ink: Zinc[950], weight: '700' as const },
  muted: { bg: Zinc[100], ink: Zinc[700], weight: '600' as const },
};

export function Initial({ name, size, tone = 'dark' }: { name: string; size: number; tone?: Tone }) {
  const look = TONES[tone];
  const letter = (name.trim().charAt(0) || '?').toUpperCase();
  // The design's letter sizes: 15 at 36, 18 at 48, 20 at 52; 14 in the
  // customer list.
  const fontSize = tone === 'muted' ? 14 : size >= 52 ? 20 : size >= 48 ? 18 : 15;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, backgroundColor: look.bg }]}>
      <Txt style={{ fontSize, fontWeight: look.weight, color: look.ink, lineHeight: fontSize * 1.3 }}>{letter}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
