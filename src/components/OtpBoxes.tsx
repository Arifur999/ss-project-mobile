import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Red, Slate, White } from '@/constants/theme';
import { westernDigits } from '@/context/LanguageContext';

export const OTP_LENGTH = 6;

export type OtpBoxesHandle = { focus: () => void };

/**
 * Six 48x56 boxes over one invisible input, as the design builds it: the boxes
 * only draw, the input does the typing (so paste and the SMS/email autofill
 * suggestion fill all six at once). Bangla digits are accepted and stored as
 * Western ones.
 */
export const OtpBoxes = forwardRef<OtpBoxesHandle, {
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  label: string;
  onSubmit?: () => void;
}>(function OtpBoxes({ value, onChange, error, disabled, label, onSubmit }, ref) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const active = focused && !disabled ? Math.min(value.length, OTP_LENGTH - 1) : -1;

  return (
    <Pressable onPress={() => input.current?.focus()} style={styles.wrap} accessible={false}>
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const digit = value.charAt(i);
          const isActive = i === active;
          return (
            <View key={i} style={styles.cell}>
              {isActive && !error ? <View style={styles.ring} /> : null}
              <View
                style={[
                  styles.box,
                  { borderColor: digit ? Slate[400] : Slate[300] },
                  isActive && styles.boxActive,
                  error && styles.boxError,
                ]}>
                <Txt style={styles.digit}>{digit}</Txt>
                {isActive && !digit ? <Caret /> : null}
              </View>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(raw) => onChange(westernDigits(raw).replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH + 4}
        caretHidden
        accessibilityLabel={label}
        aria-invalid={!!error}
        style={styles.hidden}
      />
    </Pressable>
  );
});

/** The blinking 2x26 caret in the active empty box: on 0.5s, off 0.5s. */
function Caret() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(500),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);
  return <Animated.View style={[styles.caret, { opacity }]} />;
}

const styles = StyleSheet.create({
  wrap: { height: 56 },
  row: { height: 56, flexDirection: 'row', justifyContent: 'space-between' },
  cell: { width: 48, height: 56 },
  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: White,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderWidth: 1.5, borderColor: Slate[900] },
  boxError: { borderWidth: 1.5, borderColor: Red[600], backgroundColor: Red[50] },
  digit: { fontSize: 24, fontWeight: '600', color: Slate[900], lineHeight: 30 },
  caret: { position: 'absolute', width: 2, height: 26, borderRadius: 1, backgroundColor: Slate[900] },
  hidden: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, color: 'transparent' },
});
