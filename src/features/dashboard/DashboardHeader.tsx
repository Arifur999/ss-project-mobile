import { Bell } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Initial } from '@/components/Initial';
import { EyeButton, HeaderIconButton } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';

const LOGO_DARK = require('@/assets/images/brand/logo-dark.png');

/** Logo, eye, bell and the account button, then the greeting under them. */
export function DashboardHeader({
  name,
  onNotifications,
  onAccount,
}: {
  name: string;
  onNotifications: () => void;
  onAccount: () => void;
}) {
  const t = useCopy(DASHBOARD_COPY);
  const { hidden, toggle } = useAmountShield();
  return (
    <>
      <View style={styles.bar}>
        <Image source={LOGO_DARK} resizeMode="contain" style={styles.logo} accessibilityLabel="Furnify" />
        <View style={styles.actions}>
          <EyeButton hidden={hidden} onPress={toggle} labels={{ show: t.showAmounts, hide: t.hideAmounts }} />
          <HeaderIconButton icon={Bell} label={t.notifications} onPress={onNotifications} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.account(name)}
            onPress={onAccount}
            style={styles.avatar}>
            <Initial name={name} size={36} />
          </Pressable>
        </View>
      </View>
      <View style={styles.greeting}>
        <Txt style={styles.welcome}>{t.welcome(name)}</Txt>
        <Txt style={styles.sub}>{t.sub}</Txt>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 82, height: 32 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  avatar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  greeting: { gap: 2 },
  welcome: { fontSize: 22, fontWeight: '700', lineHeight: 29.7, letterSpacing: -0.22, color: Zinc[900] },
  sub: { fontSize: 14, color: Zinc[500] },
});
