import { StyleSheet, View } from 'react-native';

import { ActionsSheet, type ExtraAction } from '@/components/ItemSheets';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { PURCHASE_COPY } from '@/features/purchase/copy';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { invoiceMetrics, receivedOf } from '@/lib/purchaseOrder';

type Row = Record<string, any>;

/**
 * A purchase invoice opened from the ledger - the website's voucher: each
 * line priced and how much of it has arrived, the ledger's totals, then
 * Receive what is still due (for whoever may), Share PDF, Print and Delete.
 */
export function InvoiceSheet({
  purchase,
  supplier,
  onClose,
  onReceiveAll,
  onShare,
  onPrint,
  onDelete,
}: {
  purchase: Row | null;
  supplier: string;
  onClose: () => void;
  onReceiveAll?: () => void;
  onShare: () => void;
  onPrint: () => void;
  onDelete?: () => void;
}) {
  const t = useCopy(PURCHASE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const num = (n: unknown) => formatNumber(n, lang);
  const items: Row[] = purchase?.purchase_items ?? [];
  const metrics = invoiceMetrics(purchase ?? {});
  const due = items.reduce((sum, item) => sum + Math.max(0, Number(item.qty || 0) - receivedOf(item)), 0);

  const extra: ExtraAction[] = [
    ...(due > 0 && onReceiveAll ? [{ label: t.receiveAll, icon: 'download' as const, onPress: onReceiveAll }] : []),
    { label: t.sharePdf, icon: 'share', onPress: onShare },
    { label: t.print, icon: 'printer', onPress: onPrint },
  ];
  const totals = [
    { label: t.totalDp, value: money(metrics.totalDpAmount) },
    { label: t.regularDiscount, value: money(metrics.discountAmount) },
    { label: t.specialDiscount, value: money(metrics.specialDiscountAmount) },
  ];

  return (
    <ActionsSheet
      open={!!purchase}
      onClose={onClose}
      title={String(purchase?.si_no || '')}
      subtitle={`${supplier} · ${dateLabel(String(purchase?.date || ''), lang)}`}
      cancelLabel={t.close}
      closeLabel={t.close}
      deleteLabel={t.deleteInvoice}
      onDelete={onDelete}
      extra={extra}>
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={String(item.id)} style={[styles.line, i > 0 && styles.divider]}>
            <View style={styles.lineTop}>
              <Txt style={styles.name} numberOfLines={2}>
                {item.product_name}
              </Txt>
              <Txt style={styles.total}>{money(item.total_amount)}</Txt>
            </View>
            <Txt style={styles.meta}>{`${item.product_code} · ${t.lineMath(num(item.qty), money(item.actual_dp), money(item.total_amount))}`}</Txt>
            <Txt style={styles.meta}>{t.lineMeta(money(item.dp_price), num(item.discount_pct), money(item.sp_amount))}</Txt>
            <Txt style={styles.received}>{t.receivedOf(num(receivedOf(item)), num(item.qty))}</Txt>
          </View>
        ))}
      </View>
      <TotalsList rows={totals} grand={{ label: t.grandTotal, value: money(metrics.grandTotal) }} />
      {purchase?.notes ? <Txt style={styles.notes}>{purchase.notes}</Txt> : null}
    </ActionsSheet>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 14, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  line: { gap: 2, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: Zinc[900] },
  total: { flexShrink: 0, fontSize: 14, fontWeight: '600', color: Zinc[900] },
  meta: { fontSize: 12, color: Zinc[500] },
  received: { fontSize: 12, fontWeight: '600', color: Zinc[700] },
  notes: { fontSize: 14, color: Zinc[700] },
});
