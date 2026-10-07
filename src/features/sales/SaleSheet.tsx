import { Pressable, StyleSheet, View } from 'react-native';

import { ActionsSheet } from '@/components/ItemSheets';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Amber, Blue, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { SALES_COPY } from '@/features/sales/copy';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import {
  deliveredQty,
  invoiceDeliveryCharge,
  pendingQty,
  saleDiscount,
  saleGrossTotal,
  saleHasMissingCost,
  saleProfit,
  salePurchaseAmount,
} from '@/lib/saleFigures';

type Row = Record<string, any>;

/**
 * A sale opened from the ledger - the website's invoice view: each line priced
 * and how much of it has gone out (with Deliver on what has not, for whoever
 * may), the invoice's totals with the previous due and the current due, where
 * the money went, its cost and profit - then Share PDF, Print and Delete.
 */
export function SaleSheet({
  sale,
  previousDue,
  paidInto,
  onClose,
  onDeliver,
  onShare,
  onPrint,
  onDelete,
}: {
  sale: Row | null;
  previousDue: number;
  paidInto: string;
  onClose: () => void;
  onDeliver?: (item: Row) => void;
  onShare: () => void;
  onPrint: () => void;
  onDelete?: () => void;
}) {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const num = (n: unknown) => formatNumber(n, lang);
  const items: Row[] = sale?.sale_items ?? [];
  const net = Number(sale?.net_amount || 0);
  const paid = Number(sale?.paid_amount || 0);
  const charge = sale ? invoiceDeliveryCharge(sale) : 0;

  return (
    <ActionsSheet
      open={!!sale}
      onClose={onClose}
      title={String(sale?.invoice_no || '')}
      subtitle={[sale?.customer_name || t.walkIn, sale?.customer_phone, dateLabel(String(sale?.date || ''), lang)].filter(Boolean).join(' · ')}
      cancelLabel={t.close}
      closeLabel={t.close}
      deleteLabel={t.deleteSale}
      onDelete={onDelete}
      extra={[
        { label: t.sharePdf, icon: 'share', onPress: onShare },
        { label: t.print, icon: 'printer', onPress: onPrint },
      ]}>
      <View style={styles.list}>
        {items.map((item, i) => {
          const pending = pendingQty(item);
          return (
            <View key={String(item.id)} style={[styles.line, i > 0 && styles.divider]}>
              <View style={styles.lineTop}>
                <Txt style={styles.name} numberOfLines={2}>
                  {item.product_name}
                </Txt>
                <Txt style={styles.total}>{money(item.total_amount)}</Txt>
              </View>
              <Txt style={styles.meta}>{`${item.product_code} · ${t.lineMath(num(item.qty), money(item.actual_price), money(item.total_amount))}`}</Txt>
              <View style={styles.deliveryRow}>
                <Txt style={[styles.delivered, pending > 0 && styles.pending]}>{t.deliveredOf(num(deliveredQty(item)), num(item.qty))}</Txt>
                {pending > 0 && onDeliver ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.deliver} ${item.product_name}`}
                    onPress={() => onDeliver(item)}
                    style={styles.deliver}>
                    <Txt style={styles.deliverText}>{t.deliver}</Txt>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <TotalsList
        rows={[
          { label: t.subtotal, value: money(sale ? saleGrossTotal(sale) : 0) },
          { label: t.discount, value: money(sale ? saleDiscount(sale) : 0) },
          ...(charge > 0 ? [{ label: t.deliveryCharge, value: money(charge) }] : []),
          { label: t.invoiceTotal, value: money(net) },
          { label: t.previousDue, value: money(previousDue) },
          { label: t.paid, value: money(paid) },
        ]}
        grand={{ label: t.currentDue, value: money(Math.max(0, previousDue + net - paid)) }}
      />
      {paidInto ? <Txt style={styles.note}>{`${t.paidInto}: ${paidInto}`}</Txt> : null}
      <TotalsList
        rows={[
          { label: t.cost, value: money(sale ? salePurchaseAmount(sale) : 0) },
          { label: t.profit, value: money(sale ? saleProfit(sale) : 0) },
        ]}
      />
      {sale && saleHasMissingCost(sale) ? <Txt style={styles.warn}>{t.profitPending}</Txt> : null}
      {sale?.notes ? <Txt style={styles.note}>{sale.notes}</Txt> : null}
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
  deliveryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 },
  delivered: { flex: 1, fontSize: 12, fontWeight: '600', color: Zinc[700] },
  pending: { color: Amber[700] },
  deliver: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: Blue[50] },
  deliverText: { fontSize: 13, fontWeight: '600', color: Blue[700] },
  note: { fontSize: 14, color: Zinc[700] },
  warn: { fontSize: 13, color: Amber[800] },
});
