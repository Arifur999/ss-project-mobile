import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { SIDE_LOOK } from '@/constants/side';
import { Blue, White, Zinc } from '@/constants/theme';
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
          const phone = String(s.phone || '').trim();
          const side = s.due_type === 'pawna' ? 'pawna' : 'dena';
          const look = SIDE_LOOK[side];
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.top}>
                <Initial name={name} size={40} tone="soft" />
                <View style={styles.who}>
                  <View style={styles.nameRow}>
                    <Txt style={styles.name} numberOfLines={2}>
                      {name}
                    </Txt>
                    {s.is_active === false ? (
                      <View style={styles.inactive}>
                        <Txt style={styles.inactiveText}>{t.inactive}</Txt>
                      </View>
                    ) : null}
                  </View>
                  {s.person_name ? <Txt style={styles.person}>{s.person_name}</Txt> : null}
                  {phone ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={t.call(name, phone)}
                      onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})}
                      style={styles.phone}>
                      <DesignIcon name="phone" size={14} color={Blue[700]} strokeWidth={2} />
                      <Txt style={styles.phoneText}>{phone}</Txt>
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => {
                    setSelected(s);
                    setSheet('actions');
                  }}
                  style={styles.more}>
                  <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
                </Pressable>
              </View>
              <View style={styles.opening}>
                <Txt style={styles.openingLabel}>{t.opening}</Txt>
                <Txt style={[styles.openingValue, { color: look.amount }]}>{money(Math.abs(Number(s.opening_due || 0)))}</Txt>
                <View style={[styles.chip, { backgroundColor: look.chipBg }]}>
                  <Txt style={[styles.chipText, { color: look.chipInk }]}>{t.side[side]}</Txt>
                </View>
              </View>
            </View>
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
  card: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, paddingRight: 4, paddingBottom: 10, paddingLeft: 14 },
  who: { flex: 1, minWidth: 0, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', lineHeight: 21, color: Zinc[900] },
  inactive: { paddingHorizontal: 8, borderRadius: 999, backgroundColor: Zinc[100] },
  inactiveText: { fontSize: 11, fontWeight: '600', color: Zinc[600] },
  person: { fontSize: 13, color: Zinc[600] },
  phone: { alignSelf: 'flex-start', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneText: { fontSize: 14, fontWeight: '500', color: Blue[700] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  opening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: Zinc[100],
    backgroundColor: Zinc[50],
  },
  openingLabel: { flex: 1, fontSize: 12, color: Zinc[500] },
  openingValue: { fontSize: 15, fontWeight: '600' },
  chip: { paddingHorizontal: 8, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
});
