import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { Txt } from '@/components/Txt';
import { Blue, White, Zinc } from '@/constants/theme';
import { callPhone } from '@/lib/phone';

export type ContactFooter = { label: string; value: string; color: string; chip?: { label: string; bg: string; ink: string } };

/**
 * Someone on a contact list - a supplier, a customer: name with an optional
 * badge, a line or two under it, the phone as a call link, a ⋮ button for
 * what may be done, and one figure along the bottom.
 */
export function ContactCard({
  name,
  badge,
  lines = [],
  phone,
  callLabel,
  onMore,
  footer,
}: {
  name: string;
  badge?: string | null;
  lines?: (string | null | undefined)[];
  phone?: string | null;
  callLabel: string;
  onMore: () => void;
  footer: ContactFooter;
}) {
  const number = String(phone || '').trim();
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Initial name={name} size={40} tone="soft" />
        <View style={styles.who}>
          <View style={styles.nameRow}>
            <Txt style={styles.name} numberOfLines={2}>
              {name}
            </Txt>
            {badge ? (
              <View style={styles.badge}>
                <Txt style={styles.badgeText}>{badge}</Txt>
              </View>
            ) : null}
          </View>
          {lines.filter(Boolean).map((line) => (
            <Txt key={line} style={styles.line} numberOfLines={2}>
              {line}
            </Txt>
          ))}
          {number ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={callLabel}
              onPress={() => callPhone(number)}
              style={styles.phone}>
              <DesignIcon name="phone" size={14} color={Blue[700]} strokeWidth={2} />
              <Txt style={styles.phoneText}>{number}</Txt>
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onMore} style={styles.more}>
          <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <Txt style={styles.footerLabel}>{footer.label}</Txt>
        <Txt style={[styles.footerValue, { color: footer.color }]}>{footer.value}</Txt>
        {footer.chip ? (
          <View style={[styles.chip, { backgroundColor: footer.chip.bg }]}>
            <Txt style={[styles.chipText, { color: footer.chip.ink }]}>{footer.chip.label}</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, paddingRight: 4, paddingBottom: 10, paddingLeft: 14 },
  who: { flex: 1, minWidth: 0, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  badge: { paddingHorizontal: 8, borderRadius: 999, backgroundColor: Zinc[100] },
  badgeText: { fontSize: 11, fontWeight: '600', color: Zinc[600] },
  line: { fontSize: 13, color: Zinc[600] },
  phone: { alignSelf: 'flex-start', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneText: { fontSize: 14, fontWeight: '500', color: Blue[700] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: Zinc[100],
    backgroundColor: Zinc[50],
  },
  footerLabel: { flex: 1, fontSize: 12, color: Zinc[500] },
  footerValue: { fontSize: 15, fontWeight: '600' },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
});
