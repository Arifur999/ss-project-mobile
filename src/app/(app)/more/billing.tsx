import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { FigureCard } from '@/components/FigureCard';
import { FilterChips } from '@/components/FilterChips';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { PROGRESS_LOOK } from '@/constants/progress';
import { Green, Red, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useAuth } from '@/context/AuthContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { BILLING_COPY } from '@/features/billing/copy';
import { effectiveSubscriptionStatus } from '@/lib/account';
import type { BillingKind } from '@/lib/billingHistory';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';
import { planFeatures, type PlanKey } from '@/lib/planFeatures';
import { useBillingHistory } from '@/services/billing.services';
import { useSmsWallet } from '@/services/sms.services';

const KINDS: ('all' | BillingKind)[] = ['all', 'plan', 'sms'];
const PAID_LOOK = { paid: PROGRESS_LOOK.all, pending: PROGRESS_LOOK.none, rejected: { bg: Red[50], ink: Red[700] } } as Record<string, { bg: string; ink: string }>;

/** Whole days from now until a date, rounded up as the website's Current Plan counts them; null without one. */
function daysUntil(date: string | null | undefined): number | null {
  return date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) : null;
}

/**
 * The owner's plan and what they have paid - the website's Current Plan and
 * Billing History, without the plan cards: the plan, its standing, when it
 * ends and what it includes; the SMS balance; and every plan payment and SMS
 * purchase. Nothing here buys or renews - the stores do not allow pointing to
 * a payment made outside them.
 */
export default function BillingScreen() {
  const t = useCopy(BILLING_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const { account, refreshAccount } = useAuth();
  const owner = account?.profile?.role === 'owner';
  const history = useBillingHistory(owner);
  const wallet = useSmsWallet(owner);
  const [kind, setKind] = useState<'all' | BillingKind>('all');
  const [refreshing, setRefreshing] = useState(false);

  const num = (n: unknown) => formatNumber(n, lang);
  const subscription = account?.subscription ?? null;
  const status = effectiveSubscriptionStatus(subscription);
  const plan = ((subscription?.plan_type as PlanKey | null) || 'free_trial') as PlanKey;
  const expiry = subscription?.expiry_date ? String(subscription.expiry_date).slice(0, 10) : '';
  const daysLeft = daysUntil(subscription?.expiry_date);
  const rows = (history.data ?? []).filter((r) => kind === 'all' || r.kind === kind);
  const spent = (k: BillingKind) => (history.data ?? []).filter((r) => r.kind === k && r.status === 'paid').reduce((s, r) => s + r.amount, 0);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshAccount(), history.refetch(), wallet.refetch()]).catch(() => {});
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Zinc[900]} />}>
        <ScreenHeader title={t.title} onBack={() => router.navigate('/more')} backLabel={t.backToMenu} />
        <View style={styles.body}>
          <View style={styles.plan}>
            <Txt style={styles.planLabel}>{t.currentPlan}</Txt>
            <View style={styles.planTop}>
              <Txt style={styles.planName}>{t.plans[plan]}</Txt>
              <View style={[styles.chip, { backgroundColor: status === 'active' ? Green[600] : 'rgba(255, 255, 255, 0.16)' }]}>
                <Txt style={styles.chipText}>{t.statuses[status] ?? status}</Txt>
              </View>
            </View>
            <View style={styles.planFigures}>
              <View style={styles.grow}>
                <Txt style={styles.planLabel}>{t.expires}</Txt>
                <Txt style={styles.planValue}>{expiry ? dateLabel(expiry, lang) : '-'}</Txt>
              </View>
              <View style={styles.grow}>
                <Txt style={styles.planLabel}>{t.daysLeft}</Txt>
                <Txt style={[styles.planValue, daysLeft !== null && daysLeft <= 3 && styles.soon]}>
                  {daysLeft === null ? '-' : daysLeft < 0 ? t.expired : t.days(daysLeft, num(daysLeft))}
                </Txt>
              </View>
            </View>
          </View>

          <View style={styles.includes}>
            <Txt style={styles.title}>{t.includes}</Txt>
            {planFeatures(lang, plan).included.map((line) => (
              <View key={line} style={styles.includeRow}>
                <DesignIcon name="check" size={16} color={Green[700]} strokeWidth={2.6} />
                <Txt style={styles.includeText}>{line}</Txt>
              </View>
            ))}
          </View>

          <View style={styles.row}>
            <FigureCard label={t.smsBalance} value={wallet.data ? num(wallet.data.balance) : '-'} />
            <FigureCard label={t.spentPlans} value={money(spent('plan'))} />
          </View>
          <FigureCard label={t.spentSms} value={money(spent('sms'))} />

          <Txt accessibilityRole="header" style={styles.title}>
            {t.history}
          </Txt>
          <FilterChips label={t.kindLabel} selected={kind} onSelect={setKind} options={KINDS.map((key) => ({ key, label: t.kinds[key] }))} />
          {history.isPending ? (
            <View style={styles.state}>
              <Spinner color={Zinc[900]} size={24} />
            </View>
          ) : history.isError ? (
            <View style={styles.state}>
              <AlertBanner tone="error">{t.loadError}</AlertBanner>
              <Button title={t.retry} variant="pillOutline" onPress={() => history.refetch()} />
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.empty}>
              <Txt style={styles.emptyText}>{t.noHistory}</Txt>
            </View>
          ) : (
            <View style={styles.list}>
              {rows.map((row, i) => {
                const look = PAID_LOOK[row.status] ?? PROGRESS_LOOK.some;
                return (
                  <View key={row.id} style={[styles.item, i > 0 && styles.divider]}>
                    <View style={styles.itemBody}>
                      <Txt style={styles.itemName}>{row.kind === 'plan' ? t.planItem(row.planType ?? '') : row.packageName || t.smsItem}</Txt>
                      {row.kind === 'sms' ? <Txt style={styles.itemMeta}>{t.smsDetail(num(row.smsCount))}</Txt> : null}
                      <Txt style={styles.itemMeta} numberOfLines={1}>
                        {[dateLabel(row.date.slice(0, 10), lang), row.invoice !== '-' ? row.invoice : '', row.trxId !== '-' ? t.trx(row.trxId) : ''].filter(Boolean).join(' · ')}
                      </Txt>
                    </View>
                    <View style={styles.itemRight}>
                      <Txt style={styles.amount}>{money(row.amount)}</Txt>
                      <View style={[styles.badge, { backgroundColor: look.bg }]}>
                        <Txt style={[styles.badgeText, { color: look.ink }]}>{t.paymentStatuses[row.status] ?? row.status}</Txt>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { paddingBottom: 24 },
  body: { gap: 14, paddingTop: 6, paddingHorizontal: 20 },
  plan: { gap: 10, padding: 16, borderRadius: 18, backgroundColor: Zinc[900] },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planName: { flex: 1, fontSize: 22, fontWeight: '700', color: White },
  planLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' },
  planFigures: { flexDirection: 'row', gap: 12 },
  planValue: { fontSize: 16, fontWeight: '600', color: White },
  soon: { color: Red[300] },
  chip: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600', color: White },
  grow: { flex: 1, minWidth: 0 },
  includes: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Zinc[200] },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  includeText: { flex: 1, fontSize: 14, color: Zinc[700] },
  row: { flexDirection: 'row', gap: 12 },
  title: { fontSize: 16, fontWeight: '600', color: Zinc[900] },
  state: { minHeight: 160, justifyContent: 'center', gap: 12 },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  itemBody: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  itemMeta: { fontSize: 12, color: Zinc[500] },
  itemRight: { flexShrink: 0, alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  badge: { paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
