import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Scrim, White, Zinc } from '@/constants/theme';

/**
 * The design's bottom sheet: a dimmed backdrop that closes it, a white panel
 * with 24px top corners and a 40x4 handle, sliding up from the bottom. Tall
 * content scrolls inside a 92% cap; forms lift above the keyboard.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  gap = 14,
  closeLabel = 'Close',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  gap?: number;
  closeLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  const [progress] = useState(() => new Animated.Value(0));

  // Stay mounted through the closing slide, then unmount.
  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(progress, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setVisible(false),
      );
    }
  }, [open, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={styles.dock}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View accessibilityViewIsModal style={[styles.panel, { transform: [{ translateY }] }]}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, { gap, paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.handle} />
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: Scrim },
  dock: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    maxHeight: '92%',
    backgroundColor: White,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: { paddingTop: 10, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: Zinc[300] },
});
