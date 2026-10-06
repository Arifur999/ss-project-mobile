import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamily, type Weight } from '@/constants/fonts';
import { useLang } from '@/context/LanguageContext';

/**
 * Text in the design's typeface. Give it a fontWeight in `style` as usual; it
 * is turned into the matching font family for the current language, because a
 * custom font in React Native cannot be bolded by fontWeight alone.
 *
 * Line height follows the design's `line-height: 1.5` unless the style sets one.
 */
export function Txt({ style, ...rest }: TextProps) {
  const { lang } = useLang();
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const weight = normaliseWeight(flat.fontWeight);
  const size = flat.fontSize ?? 16;
  return (
    <Text
      {...rest}
      style={[
        { lineHeight: Math.round(size * 1.5) },
        style,
        { fontFamily: fontFamily(lang, weight), fontWeight: undefined },
      ]}
    />
  );
}

function normaliseWeight(weight: TextStyle['fontWeight']): Weight {
  const n = typeof weight === 'number' ? weight : Number(weight);
  if (weight === 'bold') return 700;
  if (n >= 700) return 700;
  if (n >= 600) return 600;
  if (n >= 500) return 500;
  return 400;
}
