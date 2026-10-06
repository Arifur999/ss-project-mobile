import { StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { BUSINESS_COPY } from '@/features/business/copy';
import type { BusinessInfo } from '@/services/business.services';

/** The read-only list: an icon, a label and the value per field; blanks say so. */
export function BusinessDetails({ info }: { info: BusinessInfo }) {
  const t = useCopy(BUSINESS_COPY);
  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: 'store', label: t.businessName, value: info.name },
    { icon: 'phone', label: t.phone1, value: info.phone1 },
    { icon: 'phone', label: t.phone2, value: info.phone2 },
    { icon: 'mail', label: t.email, value: info.email },
    { icon: 'mapPin', label: t.address, value: info.address },
    { icon: 'globe', label: t.website, value: info.website },
    { icon: 'link', label: t.logoUrl, value: info.logoUrl.startsWith('data:') ? '' : info.logoUrl },
  ];
  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.row, i > 0 && styles.divider]}>
          <View style={styles.badge}>
            <DesignIcon name={row.icon} size={18} color={Zinc[700]} />
          </View>
          <View style={styles.text}>
            <Txt style={styles.label}>{row.label}</Txt>
            <Txt style={[styles.value, !row.value && styles.blank]}>{row.value || t.notAdded}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  badge: { width: 36, height: 36, borderRadius: 999, backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
  label: { fontSize: 13, color: Zinc[500] },
  value: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  blank: { color: Zinc[500] },
});
