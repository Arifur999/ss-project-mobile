import { HindSiliguri_400Regular } from '@expo-google-fonts/hind-siliguri/400Regular';
import { HindSiliguri_500Medium } from '@expo-google-fonts/hind-siliguri/500Medium';
import { HindSiliguri_600SemiBold } from '@expo-google-fonts/hind-siliguri/600SemiBold';
import { HindSiliguri_700Bold } from '@expo-google-fonts/hind-siliguri/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

// The screens are set in Inter, falling back to Hind Siliguri for Bangla - in
// CSS that is one font-family list. React Native has no fallback list and no
// synthetic weights: every weight is its own family name. So text picks the
// family itself (see Txt), and only the four weights the design uses are loaded.

export type Weight = 400 | 500 | 600 | 700;

export const FONT_FILES = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
};

const INTER: Record<Weight, string> = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
};

const HIND: Record<Weight, string> = {
  400: 'HindSiliguri_400Regular',
  500: 'HindSiliguri_500Medium',
  600: 'HindSiliguri_600SemiBold',
  700: 'HindSiliguri_700Bold',
};

/**
 * The family for a weight. Bangla text needs Hind Siliguri, whose Latin is
 * close enough to Inter that a mixed line ("Cash অ্যাকাউন্টে") reads as one
 * typeface - so a Bangla screen sets everything in it.
 */
export const fontFamily = (lang: 'en' | 'bn', weight: Weight = 400) =>
  (lang === 'bn' ? HIND : INTER)[weight];
