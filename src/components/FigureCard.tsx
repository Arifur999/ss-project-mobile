import { StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

export type FigureBadge = { icon: IconName; bg: string; ink: string; outlined?: boolean };

/**
 * The summary card of the Loan and Expense overviews: grey with a hairline
 * (or near-black for the headline figure), an optional 32px round badge, a
 * 13px label, the figure at 19px and a 12px caption under it.
 */
export function FigureCard({
  label,
  value,
  caption,
  badge,
  dark,
  valueColor,
  captionColor,
}: {
  label: string;
  value: string;
  caption?: string;
  badge?: FigureBadge;
  dark?: boolean;
  valueColor?: string;
  captionColor?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={[label, value, caption].filter(Boolean).join(', ')}
      style={[styles.card, badge ? styles.withBadge : styles.plain, dark ? styles.dark : styles.light]}>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badge.bg }, badge.outlined && styles.badgeOutlined]}>
          <DesignIcon name={badge.icon} size={16} color={badge.ink} />
        </View>
      ) : null}
      <View>
        <Txt style={[styles.label, { color: dark ? 'rgba(255, 255, 255, 0.75)' : Zinc[600] }]}>{label}</Txt>
        <Txt style={[styles.value, { color: valueColor ?? (dark ? White : Zinc[900]) }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Txt>
        {caption ? <Txt style={[styles.caption, { color: captionColor ?? Zinc[500] }]}>{caption}</Txt> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18 },
  withBadge: { gap: 8 },
  plain: { gap: 2 },
  light: { backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  dark: { backgroundColor: Zinc[950] },
  badge: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badgeOutlined: { borderWidth: 1, borderColor: Zinc[200] },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 19, fontWeight: '600' },
  caption: { fontSize: 12 },
});
