import { Check } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/Txt';
import { Green, White, Zinc } from '@/constants/theme';

/**
 * The confirmation that floats in under the header after a save - "Transfer
 * saved", "Business info updated" - and leaves on its own after 2.6s, as in
 * the design. One at a time; a new message replaces the old.
 */
type ToastApi = { show: (text: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setText(next);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setText(null);
        });
      }, VISIBLE_MS);
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {text ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.toast, { top: insets.top + 64, opacity }]}>
          <View style={styles.tick}>
            <Check size={16} color={White} strokeWidth={2.8} />
          </View>
          <Txt style={styles.text}>{text}</Txt>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 14,
    backgroundColor: Zinc[900],
    shadowColor: '#09090B',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tick: { width: 28, height: 28, borderRadius: 999, backgroundColor: Green[500], alignItems: 'center', justifyContent: 'center' },
  text: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: White },
});
