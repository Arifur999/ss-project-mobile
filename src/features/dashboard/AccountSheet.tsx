import { Image, Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import type { UserRole } from '@/lib/account';

const COPY = {
  en: {
    businessInfo: 'BUSINESS INFO',
    update: 'Update business info',
    close: 'Close',
    roles: { owner: 'Owner', manager: 'Manager', sales_staff: 'Sales staff', accountant: 'Accountant', super_admin: 'Super admin' } as Record<UserRole, string>,
  },
  bn: {
    businessInfo: 'ব্যবসার তথ্য',
    update: 'ব্যবসার তথ্য আপডেট করুন',
    close: 'বন্ধ করুন',
    roles: { owner: 'মালিক', manager: 'ম্যানেজার', sales_staff: 'সেলস স্টাফ', accountant: 'হিসাবরক্ষক', super_admin: 'সুপার অ্যাডমিন' } as Record<UserRole, string>,
  },
};

/** Opened from the account button: who is signed in, and the business they run. */
export function AccountSheet({
  open,
  onClose,
  name,
  role,
  email,
  phone,
  businessName,
  logoUrl,
  onUpdateBusiness,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  role?: UserRole;
  email: string;
  phone: string;
  businessName: string;
  logoUrl: string;
  onUpdateBusiness: () => void;
}) {
  const t = useCopy(COPY);
  return (
    <BottomSheet open={open} onClose={onClose} gap={16} closeLabel={t.close}>
      <View style={styles.who}>
        <Initial name={name} size={52} />
        <View style={styles.whoText}>
          <Txt accessibilityRole="header" style={styles.name}>
            {name}
          </Txt>
          {role ? <Txt style={styles.role}>{t.roles[role]}</Txt> : null}
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.section}>
        <Txt style={styles.overline}>{t.businessInfo}</Txt>
        <View style={styles.business}>
          <View style={styles.logoBox}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} resizeMode="contain" style={styles.logo} accessibilityLabel={businessName} />
            ) : (
              <DesignIcon name="store" size={20} color={Zinc[500]} />
            )}
          </View>
          <Txt style={styles.businessName}>{businessName}</Txt>
        </View>
        <View style={styles.contacts}>
          {email ? (
            <View style={styles.contact}>
              <DesignIcon name="mail" size={18} color={Zinc[500]} />
              <Txt style={styles.contactText}>{email}</Txt>
            </View>
          ) : null}
          {phone ? (
            <View style={styles.contact}>
              <DesignIcon name="phone" size={18} color={Zinc[500]} />
              <Txt style={styles.contactText}>{phone}</Txt>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={onUpdateBusiness} style={styles.update}>
        <DesignIcon name="settings" size={18} color={White} />
        <Txt style={styles.updateText}>{t.update}</Txt>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  whoText: { flexShrink: 1 },
  name: { fontSize: 18, fontWeight: '600', lineHeight: 24.3, color: Zinc[900] },
  role: { fontSize: 14, color: Zinc[500] },
  rule: { height: 1, backgroundColor: Zinc[200] },
  section: { gap: 12 },
  overline: { fontSize: 12, fontWeight: '600', letterSpacing: 0.72, color: Zinc[500] },
  business: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 60,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Zinc[200],
    backgroundColor: White,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 52, height: 28 },
  businessName: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: Zinc[900] },
  contacts: { gap: 8 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactText: { flexShrink: 1, fontSize: 14, color: Zinc[700] },
  update: { height: 52, borderRadius: 999, backgroundColor: Zinc[900], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  updateText: { fontSize: 15, fontWeight: '600', color: White },
});
