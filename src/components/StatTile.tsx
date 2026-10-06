import { StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/**
 * The grey figure tile. With an icon it is the dashboard's (16 padding, round
 * icon badge, 14px label); without, the Balance summary's (14/16 padding, 13px
 * label). Both put the figure at 20px and never wrap it.
 */
export function StatTile({
  label,
  value,
  icon,
  valueColor = Zinc[900],
}: {
  label: string;
  value: string;
  icon?: IconName;
  valueColor?: string;
}) {
  return (
    <View accessibilityLabel={`${label} ${value}`} style={[styles.tile, icon ? styles.withIcon : styles.plain]}>
      {icon ? (
        <View style={styles.badge}>
          <DesignIcon name={icon} size={18} color={Zinc[700]} />
        </View>
      ) : null}
      <View style={icon ? undefined : styles.plainBody}>
        <Txt style={icon ? styles.label : styles.plainLabel}>{label}</Txt>
        <Txt style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: Zinc[100] },
  withIcon: { padding: 16, gap: 10 },
  plain: { paddingVertical: 14, paddingHorizontal: 16 },
  plainBody: { gap: 6 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: White,
    borderWidth: 1,
    borderColor: Zinc[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '500', color: Zinc[600] },
  plainLabel: { fontSize: 13, fontWeight: '500', color: Zinc[600] },
  value: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
});
