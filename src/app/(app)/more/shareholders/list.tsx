import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Initial } from '@/components/Initial';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { Blue, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SHAREHOLDER_COPY } from '@/features/shareholders/copy';
import { ShareholderFormSheet } from '@/features/shareholders/ShareholderFormSheet';
import { ShareholderShell } from '@/features/shareholders/ShareholderShell';
import { errorMessage } from '@/lib/httpClient';
import { callPhone } from '@/lib/phone';
import { totalInvestment } from '@/lib/shareholders';
import { deleteShareholder, useShareholderData, useShareholderWrite, type Shareholder } from '@/services/shareholders.services';

/** Who owns the business: contact details, opening and total investment each. */
export default function ShareholderListScreen() {
  const t = useCopy(SHAREHOLDER_COPY);
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useShareholderWrite();
  const { data } = useShareholderData();
  const shareholders = data?.shareholders ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shareholder | null>(null);
  const [selected, setSelected] = useState<Shareholder | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  // As the website shows it: the shares make a whole once any capital exists.
  const anyCapital = shareholders.some((s) => Number(s.opening_amount || 0) > 0);

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteShareholder(selected.id));
      setSheet(null);
      toast.show(t.shareholderDeleted);
    } catch (e) {
      const linked = isAxiosError(e) && (e.response?.status === 409 || /linked|foreign|constraint/i.test(errorMessage(e)));
      setSheet(null);
      toast.show(linked ? t.linkedShareholder : errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ShareholderShell
      section="list"
      fab={{
        label: t.addShareholder,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <View style={styles.head}>
        <Txt accessibilityRole="header" style={styles.count}>
          {t.countText(shareholders.length)}
        </Txt>
        <Txt style={styles.share}>{t.totalShare(anyCapital ? '100.0' : '0.0')}</Txt>
      </View>

      {shareholders.map((sh) => {
        const phone = String(sh.phone || '');
        return (
          <View key={sh.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Initial name={sh.name} size={44} />
              <View style={styles.who}>
                <Txt style={styles.name}>{sh.name}</Txt>
                {phone ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t.call(sh.name, phone)}
                    onPress={() => callPhone(phone)}
                    style={styles.phone}>
                    <DesignIcon name="phone" size={16} color={Blue[700]} />
                    <Txt style={styles.phoneText}>{phone}</Txt>
                  </Pressable>
                ) : null}
                <View style={styles.address}>
                  <DesignIcon name="mapPin" size={16} color={sh.address ? Zinc[600] : Zinc[500]} />
                  <Txt style={[styles.addressText, { color: sh.address ? Zinc[600] : Zinc[500] }]}>{sh.address || t.noAddress}</Txt>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.shareholderOptions(sh.name)}
                onPress={() => {
                  setSelected(sh);
                  setSheet('actions');
                }}
                style={styles.more}>
                <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View style={styles.figures}>
              <View style={styles.figure}>
                <Txt style={styles.figLabel}>{t.openingAmount}</Txt>
                <Txt style={styles.figValue}>{money(Number(sh.opening_amount || 0))}</Txt>
              </View>
              <View style={[styles.figure, styles.figureDivider]}>
                <Txt style={styles.figLabel}>{t.totalInvestmentOf}</Txt>
                <Txt style={[styles.figValue, styles.figStrong]}>{money(totalInvestment(data?.investments ?? [], sh))}</Txt>
              </View>
            </View>
          </View>
        );
      })}

      <ShareholderFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected?.name ?? ''}
        subtitle={String(selected?.phone ?? '')}
        editLabel={t.editShareholder}
        deleteLabel={t.deleteShareholder}
        cancelLabel={t.cancel}
        closeLabel={t.close}
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
        title={t.deleteShareholderTitle}
        text={selected ? t.deleteShareholderText(selected.name) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ShareholderShell>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  count: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  share: { fontSize: 13, color: Zinc[500] },
  card: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, paddingRight: 4, paddingBottom: 12, paddingLeft: 16 },
  who: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 22.4, color: Zinc[900] },
  phone: { alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneText: { fontSize: 14, fontWeight: '500', color: Blue[700] },
  address: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { flexShrink: 1, fontSize: 13 },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  figures: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Zinc[100], backgroundColor: Zinc[50] },
  figure: { flex: 1, paddingVertical: 10, paddingHorizontal: 16 },
  figureDivider: { borderLeftWidth: 1, borderLeftColor: Zinc[100] },
  figLabel: { fontSize: 12, color: Zinc[500] },
  figValue: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  figStrong: { fontWeight: '700' },
});
