import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { SearchField } from '@/components/SearchField';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { CustomerAccountCard } from '@/features/customers/CustomerAccountCard';
import { CustomerAccountSheet } from '@/features/customers/CustomerAccountSheet';
import { CustomersShell } from '@/features/customers/CustomersShell';
import { DueReminderSheet } from '@/features/customers/DueReminderSheet';
import { useCan } from '@/hooks/useCan';
import { buildCustomerDashboard, type CustomerDashboardRow } from '@/lib/customerDue';
import { CUSTOMER_SORTS, customerRows, DUE_FILTERS, type CustomerSort, type DueFilter } from '@/lib/customerOverview';
import { formatNumber } from '@/lib/money';
import { isValidBdPhone } from '@/lib/phone';
import { useCustomerData } from '@/services/customers.services';

// Drawn a slice at a time, as the website's useProgressiveRows does.
const PAGE = 40;

/** What every customer bought, paid and still owes - Hatim's Customer Dashboard. */
export default function CustomerOverviewScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const can = useCan();
  const { data } = useCustomerData();
  const [search, setSearch] = useState('');
  const [due, setDue] = useState<DueFilter>('all');
  const [sort, setSort] = useState<CustomerSort>('due_desc');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<CustomerDashboardRow | null>(null);
  const [sheet, setSheet] = useState<'account' | 'remind' | null>(null);

  const { stats, customerList } = buildCustomerDashboard(data?.customers ?? [], data?.sales ?? [], data?.payments ?? []);
  const shown = customerRows(customerList, search, due, sort);
  const owing = customerList.filter((c) => c.currentDue > 0).length;

  const open = (customer: CustomerDashboardRow) => {
    setSelected(customer);
    setSheet('account');
  };
  const go = (pathname: '/customers/receive' | '/customers/ledger') => {
    setSheet(null);
    if (selected) router.push({ pathname, params: { customer: selected.id } });
  };
  const owes = (selected?.currentDue ?? 0) > 0;
  const reset = () => setLimit(PAGE);

  return (
    <CustomersShell section="overview">
      <FigureCard
        dark
        label={t.currentDue}
        value={money(stats.currentDue)}
        caption={`${t.customersCount}: ${formatNumber(stats.totalCustomers, lang)} · ${t.oweCount(owing, formatNumber(owing, lang))}`}
        valueColor={stats.currentDue > 0 ? Red[300] : White}
        badge={{ icon: 'users', bg: 'rgba(255, 255, 255, 0.12)', ink: White }}
      />
      <View style={styles.row}>
        <FigureCard label={t.totalPurchase} value={money(stats.totalPurchase)} />
        <FigureCard label={t.collections} value={money(stats.collectionsAmount)} valueColor={Green[700]} />
      </View>
      <View style={styles.row}>
        <FigureCard label={t.discount} value={money(stats.totalDiscount)} />
        <FigureCard label={t.openingDue} value={money(stats.openingDue)} />
      </View>

      <Txt accessibilityRole="header" style={styles.title}>
        {t.balances}
      </Txt>
      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          reset();
        }}
        placeholder={t.searchAccounts}
        label={t.searchLabel}
      />
      <View style={styles.controls}>
        <View style={styles.grow}>
          <FilterChips
            label={t.dueLabel}
            selected={due}
            onSelect={(d) => {
              setDue(d);
              reset();
            }}
            options={DUE_FILTERS.map((key) => ({ key, label: t.dueFilters[key] }))}
          />
        </View>
        <SelectPill
          shape="pill"
          label={t.sortLabel}
          value={sort}
          active={sort !== 'due_desc'}
          onChange={setSort}
          closeLabel={t.close}
          options={CUSTOMER_SORTS.map((key) => ({ key, label: t.sorts[key] }))}
        />
      </View>

      {shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{customerList.length === 0 ? t.noCustomers : t.noMatch}</Txt>
        </View>
      ) : (
        shown.slice(0, limit).map((customer) => <CustomerAccountCard key={customer.id} customer={customer} onPress={open} />)
      )}
      {shown.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <CustomerAccountSheet
        customer={sheet === 'account' ? selected : null}
        onClose={() => setSheet(null)}
        onReceive={can('customerPayment.create') && owes ? () => go('/customers/receive') : undefined}
        onLedger={() => go('/customers/ledger')}
        onRemind={can('sms.send') && owes && isValidBdPhone(selected?.phone || '') ? () => setSheet('remind') : undefined}
      />
      <DueReminderSheet customer={sheet === 'remind' ? selected : null} onClose={() => setSheet(null)} />
    </CustomersShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  title: { marginTop: 4, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  controls: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
