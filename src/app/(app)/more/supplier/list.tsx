import { isAxiosError } from 'axios';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ContactCard } from '@/components/ContactCard';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { SIDE_LOOK } from '@/constants/side';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { SupplierFormSheet } from '@/features/supplier/SupplierFormSheet';
import { SupplierShell } from '@/features/supplier/SupplierShell';
import { useCan } from '@/hooks/useCan';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { matches } from '@/lib/search';
import { deleteSupplier, supplierLabel, useSupplierData, useSupplierWrite, type SupplierRecord } from '@/services/supplier.services';

/** Every supplier - Hatim's Suppliers list: contact details and the opening due, add, edit, delete. */
export default function SupplierListScreen() {
  const t = useCopy(SUPPLIER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useSupplierWrite();
  const { data } = useSupplierData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SupplierRecord | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'form' | 'confirm' | null>(null);
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const suppliers = (data?.suppliers ?? []).filter((s) => matches(search, supplierLabel(s), s.person_name, s.phone));

  const openForm = (supplier: SupplierRecord | null) => {
    setEditing(supplier);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteSupplier(selected.id));
      toast.show(t.supplierDeleted(supplierLabel(selected)));
    } catch (e) {
      // As the website words it: a supplier with purchases or payments stays.
      const linked = isAxiosError(e) && (e.response?.status === 409 || /linked|foreign|constraint/i.test(errorMessage(e)));
      toast.show(linked ? t.linkedSupplier : errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <SupplierShell section="list" fab={can('supplier.write') ? { label: t.newSupplier, onPress: () => openForm(null) } : null}>
      <SearchField height={50} value={search} onChangeText={setSearch} placeholder={t.searchSuppliers} label={t.searchLabel} />
      <Txt style={styles.count}>{t.countSuppliers(suppliers.length, formatNumber(suppliers.length, lang))}</Txt>

      {suppliers.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{search.trim() ? t.noMatch : t.noSuppliers}</Txt>
        </View>
      ) : (
        suppliers.map((s) => {
          const name = supplierLabel(s);
          const side = s.due_type === 'pawna' ? 'pawna' : 'dena';
          const look = SIDE_LOOK[side];
          return (
            <ContactCard
              key={s.id}
              name={name}
              badge={s.is_active === false ? t.inactive : null}
              lines={[s.person_name]}
              phone={s.phone}
              callLabel={t.call(name, String(s.phone || '').trim())}
              onMore={() => {
                setSelected(s);
                setSheet('actions');
              }}
              footer={{
                label: t.opening,
                value: money(Math.abs(Number(s.opening_due || 0))),
                color: look.amount,
                chip: { label: t.side[side], bg: look.chipBg, ink: look.chipInk },
              }}
            />
          );
        })
      )}

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? supplierLabel(selected) : ''}
        subtitle={[selected?.person_name, selected?.phone, selected?.email, selected?.address].filter(Boolean).join(' · ')}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.editSupplier}
        deleteLabel={t.deleteSupplier}
        onEdit={can('supplier.write') ? () => openForm(selected) : undefined}
        onDelete={can('supplier.delete') ? () => setSheet('confirm') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteSupplierTitle(supplierLabel(selected)) : ''}
        text={t.deleteSupplierText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
      <SupplierFormSheet open={sheet === 'form'} onClose={() => setSheet(null)} editing={editing} />
    </SupplierShell>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
