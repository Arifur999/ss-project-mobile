import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureCard } from '@/components/FigureCard';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { PaymentSheet } from '@/features/supplier/PaymentSheet';
import { SupplierAccountCard } from '@/features/supplier/SupplierAccountCard';
import { SupplierAccountSheet } from '@/features/supplier/SupplierAccountSheet';
import { SupplierShell } from '@/features/supplier/SupplierShell';
import { useCan } from '@/hooks/useCan';
import { matches } from '@/lib/damageSummary';
import { supplierAccounts, supplierTotals, type SupplierAccount } from '@/lib/supplierSummary';
import { supplierLabel, useSupplierData } from '@/services/supplier.services';

/** What is bought, paid and owed, supplier by supplier - Hatim's Supplier Dashboard. */
export default function SupplierOverviewScreen() {
  const t = useCopy(SUPPLIER_COPY);
  const { money } = useAmountShield();
  const can = useCan();
  const { data } = useSupplierData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SupplierAccount | null>(null);
  const [sheet, setSheet] = useState<'account' | 'pay' | null>(null);

  // As on the website: the active suppliers, the one owed most first.
  const accounts = supplierAccounts(
    (data?.suppliers ?? []).filter((s) => s.is_active !== false),
    data?.purchases ?? [],
    data?.payments ?? [],
  );
  const totals = supplierTotals(accounts);
  const shown = accounts.filter((a) => matches(search, supplierLabel(a.supplier), a.supplier.person_name, a.supplier.phone));

  const open = (account: SupplierAccount) => {
    setSelected(account);
    setSheet('account');
  };

  return (
    <SupplierShell section="overview">
      <View style={styles.row}>
        <FigureCard label={t.totalPurchase} value={money(totals.totalPurchase)} caption={t.purchaseHint} />
        <FigureCard label={t.totalPaid} value={money(totals.totalPaid)} caption={t.paidHint} valueColor={Green[700]} />
      </View>
      <FigureCard
        dark
        label={t.totalPayable}
        value={money(totals.totalDue)}
        caption={t.payableHint}
        valueColor={totals.totalDue > 0 ? Red[300] : White}
        badge={{ icon: 'truck', bg: 'rgba(255, 255, 255, 0.12)', ink: White }}
      />

      <Txt accessibilityRole="header" style={styles.title}>
        {t.balances}
      </Txt>
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchSuppliers} label={t.searchLabel} />
      {shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{accounts.length === 0 ? t.noSuppliers : t.noMatch}</Txt>
        </View>
      ) : (
        shown.map((account) => <SupplierAccountCard key={account.supplier.id} account={account} onPress={open} />)
      )}

      <SupplierAccountSheet
        account={sheet === 'account' ? selected : null}
        onClose={() => setSheet(null)}
        onPay={can('supplierPayment.write') ? () => setSheet('pay') : undefined}
      />
      <PaymentSheet open={sheet === 'pay'} onClose={() => setSheet(null)} presetSupplierId={selected?.supplier.id} />
    </SupplierShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
