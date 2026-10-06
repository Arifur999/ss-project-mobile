import { ArrowLeft, Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';

/**
 * The 56-tall header of the in-app screens (Balance and its tabs): back arrow,
 * a 20px bold title, and room on the right for icon buttons.
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel,
  right,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.icon}>
        <ArrowLeft size={22} color={Zinc[900]} strokeWidth={2} />
      </Pressable>
      <Txt accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

/** A 44x44 icon button for a header's right side. */
export function HeaderIconButton({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={styles.icon}>
      <Icon size={22} color={disabled ? Zinc[400] : Zinc[700]} strokeWidth={1.8} />
    </Pressable>
  );
}

/**
 * The eye button. Like the design, it shows the action it will take: an open
 * eye while amounts are hidden, a struck-out eye while they show.
 */
export function EyeButton({ hidden, onPress, labels }: { hidden: boolean; onPress: () => void; labels: { show: string; hide: string } }) {
  return <HeaderIconButton icon={hidden ? Eye : EyeOff} label={hidden ? labels.show : labels.hide} onPress={onPress} />;
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    paddingTop: 6,
    paddingLeft: 8,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: -0.2, color: Zinc[900], lineHeight: 28 },
});
