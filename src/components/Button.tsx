import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { Red, Slate, White, Zinc } from '@/constants/theme';

/**
 * Every button shape the design uses:
 *   auth           54 tall, 12 radius, slate-900 with a soft shadow
 *   authOutline    48 tall, white with a slate border ("Back to sign in")
 *   pill           52 tall, fully round, zinc-900 (in-app primary)
 *   pillOutline    52 tall, white with a zinc border (Cancel)
 *   danger         52 tall, round, red (Delete)
 *
 * `busy` swaps in the spinner and the darker busy fill; `disabled` (only the
 * verify button uses it) greys the auth button out.
 */
type Variant = 'auth' | 'authOutline' | 'pill' | 'pillOutline' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  busy?: boolean;
  disabled?: boolean;
  /** Icon before the title (hidden while busy): a lucide icon or a DesignIcon name. */
  icon?: LucideIcon | IconName;
  /** Icon after the title - the arrow on "Go to dashboard". */
  trailingIcon?: LucideIcon;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'auth', busy, disabled, icon: Icon, trailingIcon: Trailing, style }: Props) {
  const look = LOOKS[variant];
  const inactive = busy || disabled;
  const fill = busy ? look.busyFill : disabled ? look.disabledFill : look.fill;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        look.box,
        { backgroundColor: fill },
        !disabled && look.shadow,
        pressed && styles.pressed,
        style,
      ]}>
      {busy ? (
        <Spinner color={look.ink} />
      ) : typeof Icon === 'string' ? (
        <DesignIcon name={Icon} size={18} color={look.ink} strokeWidth={look.iconStroke} />
      ) : Icon ? (
        <Icon size={18} color={look.ink} strokeWidth={look.iconStroke} />
      ) : null}
      <Txt style={[styles.title, { color: look.ink, fontSize: look.fontSize }]}>{title}</Txt>
      {Trailing && !busy ? <Trailing size={18} color={look.ink} strokeWidth={2} /> : null}
    </Pressable>
  );
}

const authShadow = {
  shadowColor: Slate[900],
  shadowOpacity: 0.18,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

const LOOKS = {
  auth: {
    box: { height: 54, borderRadius: 12, gap: 10 },
    fill: Slate[900],
    busyFill: Slate[700],
    disabledFill: Slate[400],
    ink: White,
    fontSize: 16,
    iconStroke: 2,
    shadow: authShadow,
  },
  authOutline: {
    box: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: Slate[300] },
    fill: White,
    busyFill: White,
    disabledFill: White,
    ink: Slate[900],
    fontSize: 15,
    iconStroke: 2,
    shadow: undefined,
  },
  pill: {
    box: { height: 52, borderRadius: 999, gap: 8 },
    fill: Zinc[900],
    busyFill: Zinc[700],
    disabledFill: Zinc[400],
    ink: White,
    fontSize: 16,
    iconStroke: 1.8,
    shadow: undefined,
  },
  pillOutline: {
    box: { height: 52, borderRadius: 999, borderWidth: 1, borderColor: Zinc[300], paddingHorizontal: 20 },
    fill: White,
    busyFill: White,
    disabledFill: White,
    ink: Zinc[900],
    fontSize: 16,
    iconStroke: 1.8,
    shadow: undefined,
  },
  danger: {
    box: { height: 52, borderRadius: 999 },
    fill: Red[600],
    busyFill: Red[700],
    disabledFill: Red[400],
    ink: White,
    fontSize: 16,
    iconStroke: 1.8,
    shadow: undefined,
  },
} as const;

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
