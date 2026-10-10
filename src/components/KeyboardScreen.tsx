import type { ReactNode } from 'react';
import { KeyboardAvoidingView, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A full screen that keeps the focused field above the keyboard. Android
 * draws edge to edge now, so the window no longer shrinks when the keyboard
 * opens and a form's lower fields were left underneath it; the screen makes
 * room itself instead, by padding on both platforms. The padding is measured
 * from the keyboard's real top edge, so a phone that does still shrink the
 * window gets none on top. A scroll view inside then brings the focused field
 * into sight. Bottom sheets make their own room (BottomSheet).
 */
export function KeyboardScreen({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
