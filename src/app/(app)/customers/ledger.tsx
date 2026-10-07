import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { PromptCard } from '@/components/PromptCard';
import { SelectField } from '@/components/SelectField';
import { TotalsList } from '@/components/TotalsList';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { CustomersShell } from '@/features/customers/CustomersShell';
import { LedgerLine } from '@/features/customers/LedgerLine';
import { ledgerTable } from '@/features/customers/ledgerPrint';
import { customerLedger, ledgerSummary } from '@/lib/customerLedger';
import { errorMessage } from '@/lib/httpClient';
import { printTable, shareTablePdf } from '@/lib/print';
import { smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { useCustomerData } from '@/services/customers.services';

// The latest rows first come into view; earlier ones a slice at a time above them.
const PAGE = 40;

/** One customer's sales and collections with the running due - Hatim's Customer Ledger, with Share PDF and Print. */
export default function CustomerLedgerScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const business = useBusinessSettings();
  const { data } = useCustomerData();
  const params = useLocalSearchParams<{ customer?: string }>();
  const [customerId, setCustomerId] = useState(typeof params.customer === 'string' ? params.customer : '');
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);

  const customer = data?.customers.find((c) => c.id === customerId);
  const ledger =
    customer && data
      ? customerLedger(
          customer.opening_due,
          data.sales.filter((sale) => sale.customer_id === customer.id),
          data.payments.filter((payment) => payment.customer_id === customer.id),
        )
      : [];
  const summary = ledgerSummary(customer?.opening_due, ledger);
  // Oldest first, the only order the due chain reads in - so the window keeps the latest rows.
  const visible = ledger.slice(-limit);

  const output = async (kind: 'share' | 'print') => {
    if (!customer || busy) return;
    const table = ledgerTable({ customer, ledger, summary, business: smsBusiness(business.data).businessName, t, lang, money });
    setBusy(kind);
    try {
      if (kind === 'share') await shareTablePdf(table, t.ledgerTitle(customer.name));
      else await printTable(table);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <CustomersShell section="ledger">
      <Txt style={styles.intro}>{t.ledgerIntro}</Txt>
      <View style={styles.controls}>
        <SelectField
          label={t.customerField}
          placeholder={t.chooseCustomer}
          closeLabel={t.close}
          value={customerId}
          options={(data?.customers ?? []).map((c) => ({ key: c.id, label: [c.name, c.phone].filter(Boolean).join(' - ') }))}
          onChange={(id) => {
            setCustomerId(id);
            setLimit(PAGE);
          }}
          searchPlaceholder={t.searchCustomers}
          emptyText={t.noCustomerMatch}
        />
      </View>

      {!customer ? (
        <PromptCard icon="fileText" text={t.noPersonText} />
      ) : (
        <>
          {customer.phone || customer.address ? <Txt style={styles.contact}>{[customer.phone, customer.address].filter(Boolean).join(' · ')}</Txt> : null}
          <TotalsList
            rows={[
              { label: t.openingDue, value: money(summary.openingDue) },
              { label: t.totalPurchase, value: money(summary.totalPurchase) },
              { label: t.totalDiscount, value: money(summary.totalDiscount) },
              { label: t.totalPaid, value: money(summary.totalPaid) },
            ]}
            grand={{ label: t.currentDue, value: money(summary.currentDue) }}
          />
          {ledger.length === 0 ? (
            <View style={styles.empty}>
              <Txt style={styles.emptyText}>{t.noTx}</Txt>
            </View>
          ) : (
            <>
              {ledger.length > limit ? <Button title={t.showEarlier} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}
              <View style={styles.list}>
                {visible.map((entry, i) => (
                  <LedgerLine key={entry.id} entry={entry} first={i === 0} />
                ))}
              </View>
            </>
          )}
          <View style={styles.pair}>
            <Button title={t.sharePdf} icon="share" variant="pill" busy={busy === 'share'} onPress={() => output('share')} style={styles.grow} />
            <Button title={t.print} icon="printer" variant="pillOutline" busy={busy === 'print'} onPress={() => output('print')} style={styles.grow} />
          </View>
        </>
      )}
    </CustomersShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  controls: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: Zinc[100], borderWidth: 1, borderColor: Zinc[200] },
  contact: { fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  pair: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
});
