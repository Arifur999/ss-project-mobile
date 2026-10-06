import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { BALANCE_COPY } from '@/features/balance/copy';
import { useBalance } from '@/services/balance.services';

export type BalanceSection = 'overview' | 'transfers' | 'ledger' | 'wallet';

const ROUTES: Record<BalanceSection, string> = {
  overview: '/more/balance',
  transfers: '/more/balance/transfers',
  ledger: '/more/balance/ledger',
  wallet: '/more/balance/wallet',
};

/**
 * The frame every Balance screen shares: the header (back to the menu, the
 * screen's own icon buttons), the four section chips, the scrolling body and
 * an optional floating action. Loading and failure are handled here once.
 */
export function BalanceShell({
  section,
  right,
  fab,
  bottomPadding = 24,
  children,
}: {
  section: BalanceSection;
  right?: ReactNode;
  fab?: { label: string; onPress: () => void };
  bottomPadding?: number;
  children: ReactNode;
}) {
  const t = useCopy(BALANCE_COPY);
  const query = useBalance();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: fab ? 96 : bottomPadding }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={Zinc[900]} />}>
        <ScreenHeader title={t.title} onBack={() => router.navigate('/more')} backLabel={t.backToMenu} right={right} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(Object.keys(ROUTES) as BalanceSection[]).map((key) => {
            const current = key === section;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: current }}
                onPress={() => !current && router.replace(ROUTES[key] as never)}
                style={[styles.chip, current ? styles.chipOn : styles.chipOff]}>
                <Txt style={[styles.chipText, current ? styles.chipTextOn : styles.chipTextOff]}>{t.sections[key]}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.body}>
          {query.isPending ? (
            <View style={styles.state}>
              <Spinner color={Zinc[900]} size={24} />
            </View>
          ) : query.isError ? (
            <View style={styles.state}>
              <AlertBanner tone="error">{t.loadError}</AlertBanner>
              <Button title={t.retry} variant="pillOutline" onPress={() => query.refetch()} />
            </View>
          ) : (
            children
          )}
        </View>
      </ScrollView>

      {fab && query.isSuccess ? (
        <Pressable accessibilityRole="button" onPress={fab.onPress} style={styles.fab}>
          <DesignIcon name="plus" size={20} color={White} strokeWidth={2.2} />
          <Txt style={styles.fabText}>{fab.label}</Txt>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  chips: { gap: 6, paddingTop: 6, paddingHorizontal: 20, paddingBottom: 10 },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center' },
  chipOn: { backgroundColor: Zinc[900] },
  chipOff: { backgroundColor: Zinc[100] },
  chipText: { fontSize: 14 },
  chipTextOn: { fontWeight: '600', color: White },
  chipTextOff: { fontWeight: '500', color: Zinc[700] },
  body: { paddingTop: 6, paddingHorizontal: 20, gap: 16 },
  state: { minHeight: 280, justifyContent: 'center', gap: 12 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    height: 52,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 999,
    backgroundColor: Zinc[900],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#09090B',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabText: { fontSize: 15, fontWeight: '600', color: White },
});
