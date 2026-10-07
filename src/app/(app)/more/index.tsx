import { router, type Href } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/context/LanguageContext';
import { MenuGrid, MenuTile } from '@/features/menu/MenuTile';

// The support line the website falls back to when platform settings carry none.
const SUPPORT_NUMBER = '01719731884';

const COPY = {
  en: {
    title: 'Menu',
    close: 'Close menu',
    viewProfile: 'View profile',
    language: 'Language',
    logout: 'Logout',
    sections: {
      tools: 'Quick tools',
      money: 'Money',
      stock: 'Products & stock',
      trade: 'Buying & selling',
      growth: 'Growth & team',
      account: 'Account',
    },
    items: {
      history: 'History', calculator: 'Calculator', whatsapp: 'WhatsApp',
      balance: 'Balance', shareholders: 'Shareholders', loans: 'Loan Management', expenses: 'Expenses',
      products: 'Product List', inventory: 'Inventory', damage: 'Damage',
      supplier: 'Supplier', purchase: 'Purchase', sales: 'Sales', customers: 'Customers',
      target: 'Target & Report', marketing: 'Marketing', employees: 'Employees',
      billing: 'Billing & Plan', support: 'Support', admin: 'Admin',
      profile: 'Profile',
    },
  },
  bn: {
    title: 'মেনু',
    close: 'মেনু বন্ধ করুন',
    viewProfile: 'প্রোফাইল দেখুন',
    language: 'ভাষা',
    logout: 'লগআউট',
    sections: {
      tools: 'দ্রুত টুল',
      money: 'টাকা-পয়সা',
      stock: 'পণ্য ও স্টক',
      trade: 'কেনা-বেচা',
      growth: 'প্রবৃদ্ধি ও টিম',
      account: 'অ্যাকাউন্ট',
    },
    items: {
      history: 'ইতিহাস', calculator: 'ক্যালকুলেটর', whatsapp: 'হোয়াটসঅ্যাপ',
      balance: 'ব্যালেন্স', shareholders: 'শেয়ারহোল্ডার', loans: 'লোন ব্যবস্থাপনা', expenses: 'খরচ',
      products: 'পণ্যের তালিকা', inventory: 'ইনভেন্টরি', damage: 'ড্যামেজ',
      supplier: 'সাপ্লায়ার', purchase: 'ক্রয়', sales: 'বিক্রি', customers: 'কাস্টমার',
      target: 'টার্গেট ও রিপোর্ট', marketing: 'মার্কেটিং', employees: 'কর্মচারী',
      billing: 'বিল ও প্ল্যান', support: 'সাপোর্ট', admin: 'অ্যাডমিন',
      profile: 'প্রোফাইল',
    },
  },
};

type ItemKey = keyof (typeof COPY)['en']['items'];
type Section = { key: keyof (typeof COPY)['en']['sections']; items: { key: ItemKey; icon: IconName }[] };

const SECTIONS: Section[] = [
  { key: 'tools', items: [{ key: 'history', icon: 'history' }, { key: 'calculator', icon: 'calculator' }, { key: 'whatsapp', icon: 'message' }] },
  { key: 'money', items: [{ key: 'balance', icon: 'landmark' }, { key: 'shareholders', icon: 'pieChart' }, { key: 'loans', icon: 'handCoins' }, { key: 'expenses', icon: 'receipt' }] },
  { key: 'stock', items: [{ key: 'products', icon: 'sofa' }, { key: 'inventory', icon: 'warehouse' }, { key: 'damage', icon: 'wrench' }] },
  { key: 'trade', items: [{ key: 'supplier', icon: 'truck' }, { key: 'purchase', icon: 'cart' }, { key: 'sales', icon: 'bag' }, { key: 'customers', icon: 'users' }] },
  { key: 'growth', items: [{ key: 'target', icon: 'chartLine' }, { key: 'marketing', icon: 'megaphone' }, { key: 'employees', icon: 'idCard' }] },
  { key: 'account', items: [{ key: 'billing', icon: 'creditCard' }, { key: 'support', icon: 'headset' }, { key: 'admin', icon: 'userCog' }] },
];

/** Where each designed destination lives; everything else opens /soon. */
const ROUTES: Partial<Record<ItemKey, Href>> = {
  balance: '/more/balance',
  shareholders: '/more/shareholders',
  loans: '/more/loans',
  expenses: '/more/expenses',
  products: '/more/products',
  damage: '/more/damage',
  supplier: '/more/supplier',
  purchase: '/more/purchase',
  employees: '/more/employees',
  target: '/more/reports',
  inventory: '/inventory',
  sales: '/sales',
  customers: '/customers',
};

/** The More tab: the website's sidebar as tiles, language, and sign out. */
export default function MenuScreen() {
  const t = useCopy(COPY);
  const { account, signOut } = useAuth();
  const name = account?.profile?.full_name?.trim() || account?.user.email || '';
  const role = account?.profile?.role;

  // Admin is the platform owner's alone, and billing the workspace owner's.
  const visible = (key: ItemKey) => (key === 'admin' ? role === 'super_admin' : key === 'billing' ? role === 'owner' : true);

  const open = (key: ItemKey) => {
    if (key === 'whatsapp') {
      Linking.openURL(`https://wa.me/88${SUPPORT_NUMBER}`).catch(() => {});
      return;
    }
    const route = ROUTES[key];
    if (route) router.navigate(route);
    else router.push({ pathname: '/soon', params: { title: t.items[key] } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Txt accessibilityRole="header" style={styles.title}>
            {t.title}
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={t.close} onPress={() => router.navigate('/')} style={styles.close}>
            <DesignIcon name="close" size={22} color={Zinc[900]} strokeWidth={2} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => open('profile')}
          style={({ pressed }) => [styles.profile, pressed && styles.profilePressed]}>
          <Initial name={name} size={48} tone="light" />
          <View style={styles.profileText}>
            <Txt style={styles.profileName} numberOfLines={1}>
              {name}
            </Txt>
            <Txt style={styles.profileSub}>{t.viewProfile}</Txt>
          </View>
          <View style={styles.chevron}>
            <DesignIcon name="chevronRight" size={20} color={White} strokeWidth={2} />
          </View>
        </Pressable>

        <View style={styles.language}>
          <DesignIcon name="globe" size={20} color={Zinc[700]} />
          <Txt style={styles.languageText}>{t.language}</Txt>
          <LanguageToggle variant="menu" />
        </View>

        {SECTIONS.map((section) => {
          const items = section.items.filter((item) => visible(item.key));
          if (items.length === 0) return null;
          return (
            <View key={section.key} style={styles.section}>
              <Txt accessibilityRole="header" style={styles.sectionTitle}>
                {t.sections[section.key]}
              </Txt>
              <MenuGrid>
                {items.map((item) => (
                  <MenuTile key={item.key} icon={item.icon} label={t.items[item.key]} onPress={() => open(item.key)} />
                ))}
              </MenuGrid>
            </View>
          );
        })}

        <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
          <DesignIcon name="logout" size={18} color={Red[700]} />
          <Txt style={styles.logoutText}>{t.logout}</Txt>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { gap: 20, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.22, color: Zinc[900], lineHeight: 30 },
  close: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Zinc[950] },
  profilePressed: { opacity: 0.9 },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 17, fontWeight: '600', color: White },
  profileSub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.72)' },
  chevron: { opacity: 0.8 },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Zinc[200],
  },
  languageText: { flex: 1, fontSize: 15, fontWeight: '500', color: Zinc[900] },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Zinc[500] },
  logout: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutPressed: { backgroundColor: Red[50] },
  logoutText: { fontSize: 15, fontWeight: '600', color: Red[700] },
});
