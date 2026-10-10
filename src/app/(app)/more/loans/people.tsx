import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { Blue, Green, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { LOAN_COPY } from '@/features/loans/copy';
import { LenderFormSheet } from '@/features/loans/LenderFormSheet';
import { LoanShell } from '@/features/loans/LoanShell';
import { useReach } from '@/hooks/useCan';
import { SIDE_LOOK, sideOf } from '@/constants/side';
import { errorMessage } from '@/lib/httpClient';
import { lenderKey, lenderKeyFromLoan } from '@/lib/loans';
import { callPhone } from '@/lib/phone';
import { deleteLender, useLoanData, useLoanWrite, type Lender } from '@/services/loans.services';

/** Every bank and person the business borrows from or lends to - Hatim's LoanLenderList. */
export default function LoanPeopleScreen() {
  const t = useCopy(LOAN_COPY);
  const statement = useReach().href('/more/loans/statement');
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useLoanWrite();
  const { data } = useLoanData();
  const lenders = data?.lenders ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lender | null>(null);
  const [selected, setSelected] = useState<Lender | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeCount = lenders.filter((l) => l.is_active !== false).length;

  const confirmDelete = async () => {
    if (!selected) return;
    // Rows written before lender ids existed carry only the name; the server
    // checks the id alone, so the name is checked here, as the website does.
    const key = lenderKey(selected);
    if ((data?.loans ?? []).some((loan) => lenderKeyFromLoan(loan) === key || loan.lender_name === selected.name)) {
      setSheet(null);
      return toast.show(t.linkedLender);
    }
    setDeleting(true);
    try {
      await write(() => deleteLender(selected.id));
      setSheet(null);
      toast.show(t.personDeleted(selected.name));
    } catch (e) {
      const linked = isAxiosError(e) && e.response?.status === 409;
      setSheet(null);
      toast.show(linked ? t.linkedLender : errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <LoanShell
      section="people"
      fab={{
        label: t.addPerson,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <View style={styles.head}>
        <Txt accessibilityRole="header" style={styles.count}>
          {t.countPeople(lenders.length)}
        </Txt>
        <Txt style={styles.active}>{t.activeCount(activeCount)}</Txt>
      </View>

      {lenders.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noPeopleYet}</Txt>
        </View>
      ) : null}

      {lenders.map((lender) => {
        const active = lender.is_active !== false;
        const phone = String(lender.phone || '').trim();
        const opening = Number(lender.opening_balance || 0);
        const side = sideOf(opening);
        return (
          <View key={lender.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.badge}>
                <DesignIcon name="atSign" size={20} color={Zinc[700]} />
              </View>
              <View style={styles.who}>
                <Txt style={[styles.name, { color: active ? Zinc[900] : Zinc[500] }]}>{lender.name}</Txt>
                <Txt style={[styles.address, { color: lender.address ? Zinc[600] : Zinc[500] }]}>{lender.address || t.noAddress}</Txt>
                {phone ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t.call(lender.name, phone)}
                    onPress={() => callPhone(phone)}
                    style={styles.phone}>
                    <DesignIcon name="phone" size={14} color={Blue[700]} strokeWidth={2} />
                    <Txt style={styles.phoneText}>{phone}</Txt>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.options(lender.name)}
                onPress={() => {
                  setSelected(lender);
                  setSheet('actions');
                }}
                style={styles.more}>
                <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View style={styles.figures}>
              <View style={styles.figure}>
                <Txt style={styles.figLabel}>{t.openingBalance}</Txt>
                <Txt style={[styles.figValue, { color: SIDE_LOOK[side].amount }]}>
                  {`${money(Math.abs(opening))} · ${t.side[side]}`}
                </Txt>
              </View>
              <View style={[styles.figure, styles.figureDivider]}>
                <Txt style={styles.figLabel}>{t.status}</Txt>
                <View style={styles.status}>
                  <View style={[styles.dot, { backgroundColor: active ? Green[600] : Zinc[400] }]} />
                  <Txt style={[styles.figValue, { color: active ? Green[700] : Zinc[600] }]}>{active ? t.active : t.inactive}</Txt>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      <LenderFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected?.name ?? ''}
        subtitle={String(selected?.phone ?? '')}
        editLabel={t.edit}
        deleteLabel={t.delete}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        extra={
          statement
            ? [
                {
                  label: t.viewStatement,
                  icon: 'book',
                  onPress: () => {
                    setSheet(null);
                    if (selected) router.replace({ pathname: '/more/loans/statement', params: { lender: selected.id } });
                  },
                },
              ]
            : []
        }
        onEdit={() => {
          setSheet(null);
          setEditing(selected);
          setFormOpen(true);
        }}
        onDelete={() => setSheet('confirm')}
      />

      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={selected ? t.deletePersonTitle(selected.name) : ''}
        text={t.deletePersonText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </LoanShell>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  count: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  active: { fontSize: 13, color: Zinc[500] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  card: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, paddingRight: 4, paddingBottom: 10, paddingLeft: 16 },
  badge: { width: 40, height: 40, borderRadius: 999, backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 22.4 },
  address: { fontSize: 13 },
  phone: { alignSelf: 'flex-start', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneText: { fontSize: 14, fontWeight: '500', color: Blue[700] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  figures: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Zinc[100], backgroundColor: Zinc[50] },
  figure: { flex: 1, paddingVertical: 10, paddingHorizontal: 16 },
  figureDivider: { borderLeftWidth: 1, borderLeftColor: Zinc[100] },
  figLabel: { fontSize: 12, color: Zinc[500] },
  figValue: { fontSize: 15, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 999 },
});
