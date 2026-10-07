import { Tabs } from 'expo-router/js-tabs';

import { BottomNav, type TabKey } from '@/components/BottomNav';

/**
 * The signed-in shell: five tabs under the design's own bar. JS tabs rather
 * than native ones, because the bar is drawn to the Figma file - the black
 * pill, the label weights - which native tab bars do not allow.
 */
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <BottomNav
          active={state.routes[state.index]?.name ?? 'index'}
          onPress={(key: TabKey) => {
            const route = state.routes.find((r) => r.name === key);
            const focused = state.routes[state.index]?.name === key;
            const event = navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true });
            // Tapping the tab you are on returns it to its first screen, as
            // every tab bar does: More pops back to the menu from Balance,
            // Customers back to its overview from a form.
            if (!event.defaultPrevented) {
              if (focused && (key === 'more' || key === 'customers')) navigation.navigate(key, { screen: 'index' });
              else navigation.navigate(key);
            }
          }}
        />
      )}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sales" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="customers" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
