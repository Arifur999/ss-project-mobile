import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageToggle } from '@/components/LanguageToggle';
import { Txt } from '@/components/Txt';
import { Slate, White } from '@/constants/theme';

const LOGO_LIGHT = require('@/assets/images/brand/logo-light.png');

/**
 * The photo header of sign-in (340 tall) and registration (260 tall): the
 * furniture shot, a slate gradient dark at both ends, the white logo and
 * language toggle on top, the tagline at the bottom. The white sheet below
 * overlaps it by 24, which is why the bottom padding is 44.
 */
export function AuthHero({
  photo,
  height,
  focus,
  gradient,
  stops,
  tagline,
  sub,
}: {
  photo: ImageSourcePropType;
  height: number;
  /** CSS object-position as fractions: [x, y], 0..1. */
  focus: [number, number];
  gradient: [string, string, string];
  /** Where the middle gradient colour sits, 0..1. */
  stops: [number, number, number];
  tagline: string;
  sub?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { height: height + insets.top }]}>
      <CoverPhoto photo={photo} focus={focus} />
      <LinearGradient colors={gradient} locations={stops} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: 12 + insets.top }]}>
        <View style={styles.topRow}>
          <Image source={LOGO_LIGHT} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />
          <LanguageToggle variant="onPhoto" />
        </View>
        <View style={styles.copy}>
          <Txt style={styles.tagline}>{tagline}</Txt>
          {sub ? <Txt style={styles.sub}>{sub}</Txt> : null}
        </View>
      </View>
    </View>
  );
}

/**
 * object-fit: cover with an object-position. React Native's cover always
 * centres the image, so this sizes it to cover the frame and then places it so
 * the chosen point lines up - the same arithmetic the browser does.
 */
function CoverPhoto({ photo, focus }: { photo: ImageSourcePropType; focus: [number, number] }) {
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const asset = Image.resolveAssetSource(photo);
  let box = null;
  if (frame && asset?.width && asset?.height) {
    const scale = Math.max(frame.w / asset.width, frame.h / asset.height);
    const w = asset.width * scale;
    const h = asset.height * scale;
    box = { width: w, height: h, left: (frame.w - w) * focus[0], top: (frame.h - h) * focus[1] };
  }
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip]}
      onLayout={(e) => setFrame({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box ? <Image source={photo} style={[styles.photo, box]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', backgroundColor: Slate[700] },
  clip: { overflow: 'hidden' },
  photo: { position: 'absolute' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 44, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  logo: { width: 92, height: 36 },
  copy: { gap: 8 },
  tagline: { maxWidth: 320, fontSize: 26, fontWeight: '700', lineHeight: 32.5, letterSpacing: -0.26, color: White },
  sub: { maxWidth: 330, fontSize: 14, color: 'rgba(255, 255, 255, 0.85)' },
});
