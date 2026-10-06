import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';

/** The five tabs, by route name, in the order the design draws them. */
export type TabKey = 'index' | 'sales' | 'inventory' | 'customers' | 'more';

const TABS: { key: TabKey; icon: IconName }[] = [
  { key: 'index', icon: 'home' },
  { key: 'sales', icon: 'bag' },
  { key: 'inventory', icon: 'package' },
  { key: 'customers', icon: 'users' },
  { key: 'more', icon: 'grid' },
];

const COPY = {
  en: { index: 'Home', sales: 'Sales', inventory: 'Inventory', customers: 'Customers', more: 'More' },
  bn: { index: 'হোম', sales: 'বিক্রি', inventory: 'ইনভেন্টরি', customers: 'কাস্টমার', more: 'আরও' },
};

/**
 * The bottom bar: 72 tall plus the home-indicator inset, a hairline on top, the
 * active tab's icon in a 56x30 black pill.
 */
export function BottomNav({ active, onPress }: { active: string; onPress: (key: TabKey) => void }) {
  const t = useCopy(COPY);
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { height: 72 + insets.bottom, paddingBottom: 10 + insets.bottom }]}>
      {TABS.map(({ key, icon }) => {
        const selected = key === active;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t[key]}
            onPress={() => onPress(key)}
            style={styles.item}>
            <View style={[styles.pill, selected && styles.pillActive]}>
              <DesignIcon name={icon} size={20} color={selected ? White : Zinc[500]} />
            </View>
            <Txt style={[styles.label, selected ? styles.labelActive : styles.labelIdle]}>{t[key]}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: 6,
    backgroundColor: White,
    borderTopWidth: 1,
    borderTopColor: Zinc[200],
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  pill: { width: 56, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: Zinc[900] },
  label: { fontSize: 12, lineHeight: 18 },
  labelActive: { fontWeight: '600', color: Zinc[900] },
  labelIdle: { fontWeight: '500', color: Zinc[500] },
});
