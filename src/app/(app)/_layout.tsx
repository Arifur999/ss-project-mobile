import { Tabs } from 'expo-router/js-tabs';

import { BottomNav, type TabKey } from '@/components/BottomNav';
import { useReach } from '@/hooks/useCan';

/**
 * The signed-in shell: five tabs under the design's own bar. JS tabs rather
 * than native ones, because the bar is drawn to the Figma file - the black
 * pill, the label weights - which native tab bars do not allow.
 *
 * A tab is there only when its member may open something in it (the website's
 * page ticks, ROUTE_ACCESS); More always is - the menu, support and sign out.
 * A member without the Dashboard starts on the first tab they have.
 */
export default function AppLayout() {
  const reach = useReach();
  // Where a stack tab's own first screen is, for a member it may be refused.
  const firstOf = (key: 'sales' | 'customers' | 'more') => reach.first(key)?.slice(key.length + 1) ?? 'index';

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <BottomNav
          active={state.routes[state.index]?.name ?? 'index'}
          shown={state.routes.map((route) => route.name)}
          onPress={(key: TabKey) => {
            const route = state.routes.find((r) => r.name === key);
            const focused = state.routes[state.index]?.name === key;
            const event = navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true });
            // Tapping the tab you are on returns it to its first screen, as
            // every tab bar does: More pops back to the menu from Balance,
            // Customers and Sales back to their first screen from a form.
            if (!event.defaultPrevented) {
              if (focused && (key === 'more' || key === 'customers' || key === 'sales')) navigation.navigate(key, { screen: firstOf(key) });
              else navigation.navigate(key);
            }
          }}
        />
      )}>
      <Tabs.Protected guard={reach.screen('index')}>
        <Tabs.Screen name="index" />
      </Tabs.Protected>
      <Tabs.Protected guard={reach.first('sales') !== null}>
        <Tabs.Screen name="sales" />
      </Tabs.Protected>
      <Tabs.Protected guard={reach.screen('inventory')}>
        <Tabs.Screen name="inventory" />
      </Tabs.Protected>
      <Tabs.Protected guard={reach.first('customers') !== null}>
        <Tabs.Screen name="customers" />
      </Tabs.Protected>
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
