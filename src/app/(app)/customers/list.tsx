import { isAxiosError } from 'axios';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ContactCard } from '@/components/ContactCard';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { SIDE_LOOK, sideOf } from '@/constants/side';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import { CustomerFormSheet } from '@/features/customers/CustomerFormSheet';
import { CustomersShell } from '@/features/customers/CustomersShell';
import { useCan } from '@/hooks/useCan';
import { buildCustomerDashboard } from '@/lib/customerDue';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { matches } from '@/lib/search';
import { deleteCustomer, useCustomerData, useCustomerWrite, type Customer } from '@/services/customers.services';

// Drawn a slice at a time, as the website pages its customer list.
const PAGE = 40;

/** Every customer - Hatim's Customer List: contact details and what each owes now, add, edit, delete. */
export default function CustomerListScreen() {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useCustomerWrite();
  const { data } = useCustomerData();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'form' | 'confirm' | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The website's rule for what each owes, worked out once for the whole list.
  const dueById = new Map(
    buildCustomerDashboard(data?.customers ?? [], data?.sales ?? [], data?.payments ?? []).customerList.map((c) => [c.id, c.currentDue]),
  );
  const customers = (data?.customers ?? []).filter((c) => matches(search, c.name, c.phone, c.email, c.address));

  const openForm = (customer: Customer | null) => {
    setEditing(customer);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteCustomer(selected.id));
      toast.show(t.customerDeleted);
    } catch (e) {
      // The server keeps a customer with any sale or payment, as the website's delete does.
      const linked = isAxiosError(e) && e.response?.status === 409;
      toast.show(linked ? t.linkedCustomer : errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <CustomersShell section="list" fab={can('customers.write') ? { label: t.newCustomer, onPress: () => openForm(null) } : null}>
      <SearchField
        height={50}
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          setLimit(PAGE);
        }}
        placeholder={t.searchList}
        label={t.searchLabel}
      />
      <Txt style={styles.count}>{t.countCustomers(customers.length, formatNumber(customers.length, lang))}</Txt>

      {customers.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{search.trim() ? t.noMatch : t.noCustomers}</Txt>
        </View>
      ) : (
        customers.slice(0, limit).map((c) => {
          const due = dueById.get(c.id) ?? 0;
          const side = sideOf(due);
          const look = SIDE_LOOK[side];
          return (
            <ContactCard
              key={c.id}
              name={c.name}
              lines={[c.address, c.email]}
              phone={c.phone}
              callLabel={t.call(c.name, String(c.phone || '').trim())}
              onMore={() => {
                setSelected(c);
                setSheet('actions');
              }}
              footer={{ label: t.currentDue, value: money(Math.abs(due)), color: look.amount, chip: { label: t.side[side], bg: look.chipBg, ink: look.chipInk } }}
            />
          );
        })
      )}
      {customers.length > limit ? <Button title={t.showMore} variant="pillOutline" onPress={() => setLimit((n) => n + PAGE)} /> : null}

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected?.name ?? ''}
        subtitle={[selected?.phone, selected?.email, selected?.address].filter(Boolean).join(' · ')}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.editCustomer}
        deleteLabel={t.deleteCustomer}
        onEdit={can('customers.write') ? () => openForm(selected) : undefined}
        onDelete={can('customers.delete') ? () => setSheet('confirm') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteTitle(selected.name) : ''}
        text={t.deleteText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
      <CustomerFormSheet open={sheet === 'form'} onClose={() => setSheet(null)} editing={editing} />
    </CustomersShell>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
