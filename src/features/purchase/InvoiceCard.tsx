import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { RECEIVE_LOOK, shippingState } from '@/features/purchase/status';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { invoiceMetrics } from '@/lib/purchaseOrder';

type Row = Record<string, any>;

/** A purchase invoice in the ledger: number, date, status, supplier, pieces and grand total. */
export const InvoiceCard = memo(function InvoiceCard({ purchase, supplier, onPress }: { purchase: Row; supplier: string; onPress: (purchase: Row) => void }) {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const metrics = invoiceMetrics(purchase);
  const state = shippingState(purchase.shipping_status);
  const look = RECEIVE_LOOK[state];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${purchase.si_no}, ${supplier}, ${money(metrics.grandTotal)}, ${t.statuses[state]}`}
      onPress={() => onPress(purchase)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Txt style={styles.si}>{purchase.si_no}</Txt>
        <Txt style={styles.date}>{dateLabel(String(purchase.date || ''), lang)}</Txt>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Txt style={[styles.badgeText, { color: look.ink }]}>{t.statuses[state]}</Txt>
        </View>
      </View>
      <View style={styles.bottom}>
        <Txt style={styles.supplier} numberOfLines={1}>
          {supplier}
        </Txt>
        <Txt style={styles.figures}>{`${t.pcs(formatNumber(metrics.quantity, lang))} · ${money(metrics.grandTotal)}`}</Txt>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  si: { fontSize: 14, fontWeight: '700', color: Zinc[900] },
  date: { flex: 1, fontSize: 12, color: Zinc[500] },
  badge: { paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supplier: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  figures: { flexShrink: 0, fontSize: 13, fontWeight: '600', color: Zinc[900] },
});
