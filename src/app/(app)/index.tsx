import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { ChoiceSheet } from '@/components/ChoiceSheet';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useAuth } from '@/context/AuthContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { AccountSheet } from '@/features/dashboard/AccountSheet';
import { CashflowCard } from '@/features/dashboard/CashflowCard';
import { DASHBOARD_COPY } from '@/features/dashboard/copy';
import { DashboardHeader } from '@/features/dashboard/DashboardHeader';
import { NetProfitCard } from '@/features/dashboard/NetProfitCard';
import { PeriodButton } from '@/features/dashboard/PeriodButton';
import { SalesChartCard } from '@/features/dashboard/SalesChartCard';
import { SpendingsCard } from '@/features/dashboard/SpendingsCard';
import { TopCustomersCard } from '@/features/dashboard/TopCustomersCard';
import { TotalsGrid } from '@/features/dashboard/TotalsGrid';
import { rangeLabel } from '@/lib/dates';
import { dashboardRange, type DashboardPeriod } from '@/lib/periods';
import { toBusinessInfo, useBusinessSettings } from '@/services/business.services';
import { useDashboard } from '@/services/dashboard.services';

const PERIODS: DashboardPeriod[] = ['today', 'week', 'month', 'last', 'year'];

export default function DashboardScreen() {
  const t = useCopy(DASHBOARD_COPY);
  const { lang } = useLang();
  const { account } = useAuth();
  const { money } = useAmountShield();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const query = useDashboard(period);
  const business = toBusinessInfo(useBusinessSettings().data);
  const data = query.data;

  const name = account?.profile?.full_name?.trim() || account?.user.email || '';
  const range = dashboardRange(period);
  const denied = (...tables: string[]) => tables.some((table) => data?.denied.includes(table));
  // A refused section shows a dash, never a confident zero.
  const figure = (value: number | undefined, ...tables: string[]) => (denied(...tables) ? '—' : money(value ?? 0));
  const soon = (title: string) => router.push({ pathname: '/soon', params: { title } });
  const now = new Date();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={Zinc[900]} />}>
        <DashboardHeader name={name} onNotifications={() => soon(t.notifications)} onAccount={() => setAccountOpen(true)} />

        <PeriodButton name={t.periods[period]} range={rangeLabel(range.from, range.to, lang)} onPress={() => setPeriodOpen(true)} />

        {query.isError && !data ? (
          <View style={styles.state}>
            <AlertBanner tone="error">{t.error}</AlertBanner>
            <Button title={t.retry} variant="pillOutline" onPress={() => query.refetch()} />
          </View>
        ) : !data ? (
          <View style={styles.state}>
            <Spinner color={Zinc[900]} size={24} />
          </View>
        ) : (
          <>
            {data.denied.length > 0 ? <Txt style={styles.note}>{t.denied}</Txt> : null}

            <NetProfitCard
              amount={figure(data.netProfit, 'sales', 'purchases', 'expenses', 'otherIncomes')}
              onWithdraw={() => soon(t.withdraw)}
              onSavings={() => soon(t.savings)}
            />

            <TotalsGrid
              purchase={figure(data.totalPurchases, 'purchases')}
              sales={figure(data.totalSales, 'sales')}
              profit={figure(data.totalProfit, 'sales', 'purchases', 'otherIncomes')}
              expenses={figure(data.totalExpenses, 'expenses')}
            />

            <CashflowCard days={data.cashflow} />

            <SalesChartCard key={`${period}-${data.chartYear}`} year={data.chartYear} months={data.monthly} />

            <SpendingsCard
              key={period}
              months={data.breakdown}
              fallback={{ year: Number(range.to.slice(0, 4)), month: Math.min(Number(range.to.slice(5, 7)), now.getMonth() + 1) }}
            />

            <TopCustomersCard customers={data.topCustomers} onViewAll={() => router.navigate('/customers')} />
          </>
        )}
      </ScrollView>

      <ChoiceSheet
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        title={t.selectPeriod}
        closeLabel={t.close}
        options={PERIODS.map((p) => {
          const r = dashboardRange(p);
          return { key: p, label: t.periods[p], sub: rangeLabel(r.from, r.to, lang) };
        })}
        selected={period}
        onSelect={setPeriod}
      />

      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        name={name}
        role={account?.profile?.role}
        email={account?.user.email ?? ''}
        phone={account?.profile?.phone ?? ''}
        businessName={business.name || account?.subscription?.business_name || ''}
        logoUrl={business.logoUrl}
        onUpdateBusiness={() => {
          setAccountOpen(false);
          router.push('/business-info');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { gap: 16, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  state: { minHeight: 280, justifyContent: 'center', gap: 12 },
  note: { fontSize: 13, color: Zinc[600] },
});
