import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';

// Placeholder icons from the Expo template until the Figma set is exported.
export default function TabLayout() {
  const { t } = useLang();
  return (
    <NativeTabs
      backgroundColor={Colors.background}
      indicatorColor={Colors.surface}
      labelStyle={{ selected: { color: Colors.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('nav_dashboard')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('nav_settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/explore.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
