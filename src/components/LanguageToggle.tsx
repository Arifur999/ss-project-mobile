import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Slate, White, Zinc } from '@/constants/theme';
import { useLang, type Lang } from '@/context/LanguageContext';

/**
 * The EN | বাংলা pill. Three looks, one per place the design puts it:
 *   onPhoto - over the sign-in / registration photo (translucent dark track)
 *   light   - the top bar of the verification and forgot-password screens
 *   menu    - the Language row of the More menu (zinc, 40 tall)
 */
type Variant = 'onPhoto' | 'light' | 'menu';

const OPTIONS: { value: Lang; label: string; minWidth: number }[] = [
  { value: 'en', label: 'EN', minWidth: 52 },
  { value: 'bn', label: 'বাংলা', minWidth: 60 },
];

export function LanguageToggle({ variant }: { variant: Variant }) {
  const { lang, setLang } = useLang();
  const look = LOOKS[variant];
  return (
    <View accessibilityRole="radiogroup" style={[styles.track, look.track]}>
      {OPTIONS.map((option) => {
        const selected = option.value === lang;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setLang(option.value)}
            style={[
              styles.option,
              { minWidth: option.minWidth, height: look.height },
              selected && look.selected,
            ]}>
            <Txt
              style={[
                styles.label,
                { color: selected ? look.selectedInk : look.ink },
                // The Bangla label is set in Hind Siliguri even on an English
                // screen, so বাংলা always renders as itself.
                option.value === 'bn' && styles.bnLabel,
              ]}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const shadow = {
  shadowColor: Slate[900],
  shadowOpacity: 0.1,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

const LOOKS = {
  onPhoto: {
    height: 44,
    track: { backgroundColor: 'rgba(15, 23, 42, 0.38)', borderColor: 'rgba(255, 255, 255, 0.28)' },
    selected: { backgroundColor: White },
    selectedInk: Slate[900],
    ink: White,
  },
  light: {
    height: 44,
    track: { backgroundColor: Slate[100], borderColor: Slate[200] },
    selected: { backgroundColor: White, ...shadow },
    selectedInk: Slate[900],
    ink: Slate[600],
  },
  menu: {
    height: 40,
    track: { backgroundColor: Zinc[100], borderColor: Zinc[200] },
    selected: { backgroundColor: White, ...shadow, shadowColor: '#09090B' },
    selectedInk: Zinc[900],
    ink: Zinc[600],
  },
} as const;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  option: {
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  bnLabel: { fontFamily: 'HindSiliguri_600SemiBold' },
});
