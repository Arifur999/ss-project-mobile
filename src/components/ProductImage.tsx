import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Zinc } from '@/constants/theme';
import { sizedImageUrl } from '@/lib/imageUrl';

/**
 * A product's photo in a grey rounded square, fetched at the size it is drawn
 * and cached on the phone. No photo, or one that will not load, shows the
 * sofa mark instead of an empty box.
 */
export function ProductImage({ url, size, radius = 12, label }: { url: string | null | undefined; size: number; radius?: number; label?: string }) {
  const uri = sizedImageUrl(url, size);
  // Remembered per address, so a row reused for another product tries its photo afresh.
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = uri && failed !== uri;

  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={[styles.box, { width: size, height: size, borderRadius: radius }]}>
      {showPhoto ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          recyclingKey={uri}
          onError={() => setFailed(uri)}
        />
      ) : (
        <DesignIcon name="sofa" size={Math.round(size * 0.42)} color={Zinc[400]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
