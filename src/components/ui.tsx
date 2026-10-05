import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

// Placeholder building blocks until the Figma design lands. Screens use only
// these, so restyling the app is a change to this file.

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  const textColor = variant === 'secondary' ? Colors.ink : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: Colors.ink },
        variant === 'secondary' && { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
        variant === 'danger' && { backgroundColor: Colors.danger },
        (pressed || inactive) && { opacity: 0.6 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

export function TextField({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={Colors.textSecondary} style={styles.input} {...input} />
    </View>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  field: { gap: Spacing.xs },
  label: { fontSize: 14, fontWeight: '500', color: Colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  error: { color: Colors.danger, fontSize: 14 },
});
