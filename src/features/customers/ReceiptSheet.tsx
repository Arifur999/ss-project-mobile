import { StyleSheet, View } from 'react-native';

import { ActionsSheet } from '@/components/ItemSheets';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { receiptNo, type Receipt } from '@/lib/customerReceipts';
import { dateLabel } from '@/lib/dates';

/**
 * A due collection opened from the list - the website's receipt view: the due
 * before, each account the money went into, any discount, the due after, who
 * took it and why - then Share PDF, Print and, for whoever may, Delete.
 */
export function ReceiptSheet({
  receipt,
  onClose,
  onShare,
  onPrint,
  onDelete,
}: {
  receipt: Receipt | null;
  onClose: () => void;
  onShare: () => void;
  onPrint: () => void;
  onDelete?: () => void;
}) {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const details = receipt
    ? [
        receipt.payment_receiver ? `${t.receivedBy}: ${receipt.payment_receiver}` : '',
        receipt.discount > 0 && receipt.discount_category ? `${t.bookedUnder}: ${receipt.discount_category}` : '',
        receipt.display_notes,
      ].filter(Boolean)
    : [];

  return (
    <ActionsSheet
      open={!!receipt}
      onClose={onClose}
      title={receipt?.customer_name ?? ''}
      subtitle={receipt ? `${receiptNo(receipt)} · ${dateLabel(String(receipt.date || ''), lang)}` : ''}
      cancelLabel={t.close}
      closeLabel={t.close}
      deleteLabel={t.deleteReceipt}
      onDelete={onDelete}
      extra={[
        { label: t.sharePdf, icon: 'share', onPress: onShare },
        { label: t.print, icon: 'printer', onPress: onPrint },
      ]}>
      <TotalsList
        rows={[
          { label: t.previousDue, value: money(receipt?.previous_due) },
          ...(receipt?.payment_methods ?? []).map((method, i) => ({ label: method.account_name || `${t.received} ${i + 1}`, value: money(method.amount) })),
          ...(receipt && receipt.discount > 0 ? [{ label: t.discount, value: money(receipt.discount) }] : []),
        ]}
        grand={{ label: t.dueAfter, value: money(receipt?.current_due) }}
      />
      {details.length ? (
        <View style={styles.details}>
          {details.map((line) => (
            <Txt key={line} style={styles.detail}>
              {line}
            </Txt>
          ))}
        </View>
      ) : null}
    </ActionsSheet>
  );
}

const styles = StyleSheet.create({
  details: { gap: 4 },
  detail: { fontSize: 14, color: Zinc[700] },
});
