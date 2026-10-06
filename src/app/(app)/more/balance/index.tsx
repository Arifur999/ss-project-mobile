import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/FilterChips';
import { EyeButton } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { Txt } from '@/components/Txt';
import { Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { AccountCard, flowInk } from '@/features/balance/AccountCard';
import { BalanceShell } from '@/features/balance/BalanceShell';
import { BALANCE_COPY } from '@/features/balance/copy';
import { activeFirst } from '@/lib/balance';
import { accountTotals, BALANCE_TABS } from '@/lib/balanceTabs';
import { useBalance } from '@/services/balance.services';

/** Balance: where the money stands, account by account, in five views. */
export default function BalanceOverviewScreen() {
  const t = useCopy(BALANCE_COPY);
  const { lang } = useLang();
  const { money, hidden, toggle } = useAmountShield();
  const { data } = useBalance();
  const [tabKey, setTabKey] = useState(BALANCE_TABS[0].key);

  const rows = activeFirst(data?.rows ?? []).map((row) => ({ ...row, ...accountTotals(row) }));
  const tab = BALANCE_TABS.find((x) => x.key === tabKey) ?? BALANCE_TABS[0];
  const closing = tab.columns.find((c) => c.closing) ?? tab.columns[tab.columns.length - 1];
  const others = tab.columns.filter((c) => c !== closing).map((column) => ({ column, label: t.columns[column.labelKey] ?? column.labelKey }));

  const total = rows.reduce((s, r) => s + r.current_balance, 0);
  const inactiveAmount = rows.filter((r) => !r.is_active).reduce((s, r) => s + r.current_balance, 0);
  const available = rows.filter((r) => r.is_active).reduce((s, r) => s + r.current_balance, 0);
  const sum = (key: string) => rows.reduce((s, r) => s + ((r as Record<string, number | string | boolean>)[key] as number || 0), 0);
  const count = lang === 'bn' ? bnDigits(rows.length) : String(rows.length);
  const closingTotal = sum(closing.key);

  return (
    <BalanceShell
      section="overview"
      right={<EyeButton hidden={hidden} onPress={toggle} labels={{ show: t.showAmounts, hide: t.hideAmounts }} />}>
      <View style={styles.stats}>
        <View style={styles.statRow}>
          <StatTile label={t.totalAccounts} value={count} />
          <StatTile label={t.totalBalance} value={money(total)} valueColor={total < 0 ? Red[600] : Zinc[900]} />
        </View>
        <View style={styles.statRow}>
          <StatTile label={t.inactiveAmount} value={money(inactiveAmount)} />
          <StatTile label={t.availableBalance} value={money(available)} valueColor={available < 0 ? Red[600] : Zinc[900]} />
        </View>
      </View>

      <View style={styles.detailsHead}>
        <Txt accessibilityRole="header" style={styles.detailsTitle}>
          {t.accountDetails}
        </Txt>
        <Txt style={styles.count}>{t.nAccounts(rows.length)}</Txt>
      </View>

      <View style={styles.chips}>
        <FilterChips
          bleed
          label={t.accountDetails}
          options={BALANCE_TABS.map((x) => ({ key: x.key, label: t.tabs[x.key] ?? x.key }))}
          selected={tabKey}
          onSelect={setTabKey}
        />
      </View>

      <View style={styles.list}>
        {rows.map((row, i) => (
          <AccountCard
            key={row.id}
            first={i === 0}
            name={row.name}
            inactive={!row.is_active}
            inactiveLabel={t.inactive}
            figures={row as unknown as Record<string, number>}
            columns={others}
            closing={closing}
            money={money}
            accessibilityLabel={t.openLedger(row.name, money(row.current_balance))}
            onPress={() => router.push({ pathname: '/more/balance/ledger', params: { account: row.id } })}
          />
        ))}
      </View>

      <View style={styles.total}>
        <View style={styles.totalHead}>
          <Txt style={styles.totalTitle}>{t.totalLine(t.columns[closing.labelKey] ?? '')}</Txt>
          <Txt style={[styles.totalFigure, { color: closingTotal < 0 ? Red[400] : White }]}>{money(closingTotal)}</Txt>
        </View>
        <View style={styles.totalGrid}>
          {others.map(({ column, label }) => (
            <View key={column.key} style={styles.totalCell}>
              <Txt style={styles.totalLabel}>{label}</Txt>
              <Txt style={[styles.totalValue, { color: flowInk(column, sum(column.key), true) }]} numberOfLines={1}>
                {money(sum(column.key))}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </BalanceShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: 12 },
  statRow: { flexDirection: 'row', gap: 12 },
  detailsHead: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  detailsTitle: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  count: { fontSize: 13, color: Zinc[500] },
  chips: { marginTop: -4 },
  list: { borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  total: { gap: 14, paddingVertical: 18, paddingHorizontal: 20, borderRadius: 20, backgroundColor: Zinc[950] },
  totalHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  totalTitle: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: White },
  totalFigure: { fontSize: 20, fontWeight: '600' },
  totalGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  totalCell: { width: '33.333%', paddingRight: 8 },
  totalLabel: { fontSize: 11, color: 'rgba(255, 255, 255, 0.65)', lineHeight: 16.5 },
  totalValue: { fontSize: 13, fontWeight: '600' },
});
