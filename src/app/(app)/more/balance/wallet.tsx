import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Toggle } from '@/components/Toggle';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useLang, useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { AccountFormSheet } from '@/features/balance/AccountFormSheet';
import { BalanceShell } from '@/features/balance/BalanceShell';
import { BALANCE_COPY } from '@/features/balance/copy';
import type { Account } from '@/lib/balance';
import { errorMessage } from '@/lib/httpClient';
import { formatMoney } from '@/lib/money';
import { deleteAccount, updateAccount, useBalance, useBalanceWrite } from '@/services/balance.services';

/** The accounts money sits in: switch one off, edit it, delete it, add one. */
export default function WalletScreen() {
  const t = useCopy(BALANCE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const write = useBalanceWrite();
  const { data } = useBalance();
  const accounts = data?.accounts ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // Opening balances are not secret the way running balances are, so the
  // wallet shows them whatever the eye button says - as the design does.
  const money = (n: number) => formatMoney(n, lang);
  const activeCount = accounts.filter((a) => a.is_active).length;

  const toggle = async (account: Account) => {
    setSwitching(account.id);
    try {
      await write(() => updateAccount(account.id, { is_active: !account.is_active }));
      toast.show(account.is_active ? t.turnedOff(account.name) : t.turnedOn(account.name));
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setSwitching(null);
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteAccount(selected.id));
      setSheet(null);
      setSelected(null);
      toast.show(t.accountDeleted);
    } catch (e) {
      // An account with transactions behind it cannot go - say why, as the
      // website does, rather than the raw constraint error.
      const linked = isAxiosError(e) && (e.response?.status === 409 || /linked|foreign|constraint/i.test(errorMessage(e)));
      setSheet(null);
      toast.show(linked ? t.linked : errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <BalanceShell
      section="wallet"
      fab={{
        label: t.addAccount,
        onPress: () => {
          setEditing(null);
          setFormOpen(true);
        },
      }}>
      <View style={styles.head}>
        <Txt accessibilityRole="header" style={styles.title}>
          {t.accounts}
        </Txt>
        <Txt style={styles.count}>{t.walletCount(accounts.length, activeCount)}</Txt>
      </View>

      <View style={styles.list}>
        {accounts.map((account, i) => (
          <View key={account.id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Txt style={[styles.name, { color: account.is_active ? Zinc[900] : Zinc[500] }]}>{account.name}</Txt>
                {!account.is_active ? (
                  <View style={styles.badge}>
                    <Txt style={styles.badgeText}>{t.inactive}</Txt>
                  </View>
                ) : null}
              </View>
              <Txt style={styles.opening}>{t.openingOf(money(account.opening_balance))}</Txt>
            </View>
            <Toggle
              value={account.is_active}
              onChange={() => toggle(account)}
              label={t.activeSwitch(account.name)}
              disabled={switching === account.id}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.accountOptions(account.name)}
              onPress={() => {
                setSelected(account);
                setSheet('actions');
              }}
              style={styles.more}>
              <DesignIcon name="moreVertical" size={20} color={Zinc[600]} strokeWidth={2.4} />
            </Pressable>
          </View>
        ))}
      </View>

      <AccountFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} accounts={accounts} />

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? t.openingOf(money(selected.opening_balance)) : ''}
        editLabel={t.editAccount}
        deleteLabel={t.deleteAccount}
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
        title={t.deleteAccountTitle}
        text={selected ? t.deleteAccountText(selected.name) : ''}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </BalanceShell>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  count: { fontSize: 13, color: Zinc[500] },
  list: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 16, paddingRight: 4 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  info: { flex: 1, minWidth: 0, paddingVertical: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, borderRadius: 999, backgroundColor: Zinc[100] },
  badgeText: { fontSize: 12, fontWeight: '600', color: Zinc[600], lineHeight: 18 },
  opening: { fontSize: 13, color: Zinc[500] },
  more: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
