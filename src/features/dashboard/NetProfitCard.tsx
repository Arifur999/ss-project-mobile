import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';

const GLOW = 280;
// CSS `radial-gradient(circle, …)` sizes to the farthest corner, so its 70%
// stop sits at 0.7 x (140 x √2) from the centre - nearly the box's edge.
const GLOW_RADIUS = (GLOW / 2) * Math.SQRT2;

/** The dark hero card: Net Profit, with Withdraw and Savings under it. */
export function NetProfitCard({
  amount,
  onWithdraw,
  onSavings,
}: {
  amount: string;
  onWithdraw: () => void;
  onSavings: () => void;
}) {
  const t = useCopy(DASHBOARD_COPY);
  return (
    <View accessibilityLabel={`${t.netProfit} ${amount}`} style={styles.card}>
      <Svg pointerEvents="none" width={GLOW} height={GLOW} style={styles.glow}>
        <Defs>
          <RadialGradient id="glow" cx={GLOW / 2} cy={GLOW / 2} r={GLOW_RADIUS} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={White} stopOpacity={0.26} />
            <Stop offset="0.7" stopColor={White} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={GLOW} height={GLOW} rx={GLOW / 2} fill="url(#glow)" />
      </Svg>
      <View style={styles.figure}>
        <Txt style={styles.label}>{t.netProfit}</Txt>
        <Txt style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
          {amount}
        </Txt>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onWithdraw} style={[styles.action, styles.solid]}>
          <DesignIcon name="handCoins" size={18} color={Zinc[900]} />
          <Txt style={[styles.actionText, { color: Zinc[900] }]}>{t.withdraw}</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onSavings} style={[styles.action, styles.outline]}>
          <DesignIcon name="vault" size={18} color={White} />
          <Txt style={[styles.actionText, { color: White }]}>{t.savings}</Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', gap: 28, padding: 20, borderRadius: 20, backgroundColor: Zinc[950] },
  glow: { position: 'absolute', right: -70, top: -90 },
  figure: { gap: 4 },
  label: { fontSize: 14, color: 'rgba(255, 255, 255, 0.75)' },
  amount: { fontSize: 36, fontWeight: '600', lineHeight: 43.2, letterSpacing: -0.72, color: White },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, height: 48, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  solid: { backgroundColor: White },
  outline: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  actionText: { fontSize: 15, fontWeight: '600' },
});
