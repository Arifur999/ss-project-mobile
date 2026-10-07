import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';

export type ChoiceLook = { border: string; bg: string; ink: string; sub: string };

/** Chosen: filled black, as the design marks a picked category or opening side. */
export const PICKED_DARK: ChoiceLook = { border: Zinc[900], bg: Zinc[900], ink: White, sub: 'rgba(255, 255, 255, 0.75)' };
/** Chosen money in (Received, a refund): green. */
export const PICKED_IN: ChoiceLook = { border: Green[600], bg: Green[50], ink: Green[800], sub: Green[700] };
/** Chosen money out (Paid, a repair cost): red. */
export const PICKED_OUT: ChoiceLook = { border: Red[600], bg: Red[50], ink: Red[800], sub: Red[700] };
const IDLE: ChoiceLook = { border: Zinc[200], bg: White, ink: Zinc[900], sub: Zinc[500] };

/**
 * One of a row of radio cards, 64 tall at least: a title and a line under it,
 * led by a 20px icon (Principal / Profit, Received / Paid) or a coloured dot
 * above (Pawna / Dena / Zero). `invalid` reddens an unchosen card's border.
 */
export function ChoiceCard({
  title,
  sub,
  selected,
  onPress,
  picked = PICKED_DARK,
  icon,
  dot,
  invalid,
}: {
  title: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
  picked?: ChoiceLook;
  icon?: IconName;
  dot?: string;
  invalid?: boolean;
}) {
  const look = selected ? picked : IDLE;
  const thick = selected || invalid;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${sub}`}
      onPress={onPress}
      style={[
        styles.card,
        icon ? styles.withIcon : styles.withDot,
        { backgroundColor: look.bg, borderWidth: thick ? 1.5 : 1, borderColor: !selected && invalid ? Red[600] : look.border },
      ]}>
      {icon ? <DesignIcon name={icon} size={20} color={look.ink} strokeWidth={icon === 'banknote' || icon === 'percent' ? 1.8 : 2.2} /> : null}
      <View style={icon ? styles.iconText : undefined}>
        <View style={styles.titleRow}>
          {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
          <Txt style={[icon ? styles.title : styles.titleSmall, { color: look.ink }]}>{title}</Txt>
        </View>
        <Txt style={[styles.sub, { color: look.sub }]}>{sub}</Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: 64, borderRadius: 12 },
  withIcon: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  withDot: { justifyContent: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 10 },
  iconText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 999, flexShrink: 0 },
  title: { fontSize: 14, fontWeight: '700' },
  titleSmall: { fontSize: 13, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 16.2 },
});
