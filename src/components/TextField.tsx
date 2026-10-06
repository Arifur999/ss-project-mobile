import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { FieldError } from '@/components/FieldError';
import { Txt } from '@/components/Txt';
import { fontFamily } from '@/constants/fonts';
import { Red, Slate, White, Zinc } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';

/**
 * A labelled input in either of the design's two styles:
 *   slate - the sign-in and registration forms: 52 tall, icon on the left
 *   zinc  - forms inside the app (business info, sheets): 50 tall, no icon
 *
 * Focus draws the design's 3px ring (a CSS box-shadow there) as a tinted layer
 * behind the input; an error turns the border red and the fill pale red.
 */
type Tone = 'slate' | 'zinc';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  error?: string | null;
  /** Show the eye button and mask the value. Labels are for screen readers. */
  password?: { show: string; hide: string };
  /** Grow into a textarea of at least this height. */
  minHeight?: number;
  /**
   * Plain error text under the field, as the in-app sheets draw it. An error of
   * only whitespace marks the field red without a message - for a row whose
   * message is shown once beneath several fields.
   */
  plainError?: boolean;
  /** A grey hint under the field when there is no error. */
  hint?: string;
  inputStyle?: TextStyle;
  /** The smaller 13px grey label of a field paired in a row. */
  labelStyle?: TextStyle;
};

const TONES = {
  slate: { height: 52, labelGap: 8, border: Slate[300], focus: Slate[900], ring: 'rgba(15, 23, 42, 0.12)', ink: Slate[900], placeholder: Slate[500], icon: Slate[500], hint: Slate[500] },
  zinc: { height: 50, labelGap: 6, border: Zinc[300], focus: Zinc[900], ring: 'rgba(24, 24, 27, 0.12)', ink: Zinc[900], placeholder: Zinc[500], icon: Zinc[500], hint: Zinc[500] },
} as const;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, tone = 'slate', icon: Icon, error, password, minHeight, plainError, hint, inputStyle, labelStyle, onFocus, onBlur, ...input },
  ref,
) {
  const { lang } = useLang();
  const t = TONES[tone];
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const multiline = minHeight !== undefined;
  const invalid = !!error;

  return (
    <View style={{ gap: t.labelGap }}>
      {label ? <Txt style={[styles.label, { color: t.ink }, labelStyle]}>{label}</Txt> : null}
      <View>
        {focused && (
          <View
            pointerEvents="none"
            style={[styles.ring, { backgroundColor: invalid ? 'rgba(220, 38, 38, 0.14)' : t.ring }]}
          />
        )}
        {Icon && (
          <View pointerEvents="none" style={[styles.icon, { top: multiline ? 15 : 16 }]}>
            <Icon size={20} color={t.icon} strokeWidth={1.8} />
          </View>
        )}
        <TextInput
          ref={ref}
          {...input}
          multiline={multiline}
          secureTextEntry={!!password && !revealed}
          placeholderTextColor={t.placeholder}
          accessibilityLabel={input.accessibilityLabel ?? label}
          accessibilityState={{ disabled: input.editable === false }}
          aria-invalid={invalid}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              height: multiline ? undefined : t.height,
              minHeight: multiline ? minHeight : undefined,
              paddingLeft: Icon ? 44 : 14,
              paddingRight: password ? 52 : 14,
              paddingVertical: multiline ? 13 : 0,
              textAlignVertical: multiline ? 'top' : 'center',
              color: t.ink,
              fontFamily: fontFamily(lang, 400),
              borderColor: invalid ? Red[600] : focused ? t.focus : t.border,
              // Only an error thickens the border; focus is the colour change
              // plus the ring behind.
              borderWidth: invalid ? 1.5 : 1,
              backgroundColor: invalid ? Red[50] : White,
            },
            inputStyle,
          ]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? password.hide : password.show}
            onPress={() => setRevealed((v) => !v)}
            style={styles.eye}>
            {revealed ? (
              <EyeOff size={20} color={t.icon} strokeWidth={1.8} />
            ) : (
              <Eye size={20} color={t.icon} strokeWidth={1.8} />
            )}
          </Pressable>
        )}
      </View>
      {error?.trim() ? (
        <FieldError plain={plainError}>{error}</FieldError>
      ) : hint ? (
        <Txt style={[styles.hint, { color: t.hint }]}>{hint}</Txt>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600' },
  ring: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 15 },
  icon: { position: 'absolute', left: 14, zIndex: 1 },
  input: { width: '100%', borderRadius: 12, fontSize: 16, lineHeight: 24 },
  eye: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 13 },
});
