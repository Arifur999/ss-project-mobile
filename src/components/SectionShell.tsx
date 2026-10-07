import { router } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/** The state of whatever query feeds the section. */
type QueryState = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  refetch: () => unknown;
};

export type Section<K extends string> = { key: K; label: string; route: string };

/**
 * The frame of a section with sub-screens (Balance, Shareholders, Loans,
 * Expenses, the Customers tab): a header - back to the menu for a More-menu
 * section, none for a tab, which the tab bar leaves - with room for icon buttons,
 * the section chips, pull to refresh, loading and failure handled once, and an
 * optional floating "New …" button.
 */
export function SectionShell<K extends string>({
  title,
  backLabel,
  sections,
  current,
  query,
  errorText,
  retryLabel,
  right,
  fab,
  gap = 16,
  children,
}: {
  title: string;
  /** Shown as the back arrow's label; without one the header has no back arrow. */
  backLabel?: string;
  sections: Section<K>[];
  current: K;
  query: QueryState;
  errorText: string;
  retryLabel: string;
  right?: ReactNode;
  fab?: { label: string; onPress: () => void } | null;
  /** Space between the body's blocks: 16, or 14 on the denser lists. */
  gap?: number;
  children: ReactNode;
}) {
  const chipsRef = useRef<ScrollView>(null);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: fab ? 96 : 24 }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={Zinc[900]} />}>
        <ScreenHeader title={title} onBack={backLabel ? () => router.navigate('/more') : undefined} backLabel={backLabel} right={right} />

        <ScrollView ref={chipsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {sections.map((section) => {
            const on = section.key === current;
            return (
              <Pressable
                key={section.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => !on && router.replace(section.route as never)}
                // The last sections sit past the screen edge; bring the current one into view.
                onLayout={on ? (e) => chipsRef.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 20), animated: false }) : undefined}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                <Txt style={[styles.chipText, on ? styles.chipTextOn : styles.chipTextOff]}>{section.label}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.body, { gap }]}>
          {query.isPending ? (
            <View style={styles.state}>
              <Spinner color={Zinc[900]} size={24} />
            </View>
          ) : query.isError ? (
            <View style={styles.state}>
              <AlertBanner tone="error">{errorText}</AlertBanner>
              <Button title={retryLabel} variant="pillOutline" onPress={() => query.refetch()} />
            </View>
          ) : (
            children
          )}
        </View>
      </ScrollView>

      {fab && query.isSuccess ? <Fab label={fab.label} onPress={fab.onPress} /> : null}
    </SafeAreaView>
  );
}

/** The floating "+ New …" pill, bottom right above the tab bar. */
export function Fab({ label, onPress, floating = true }: { label: string; onPress: () => void; floating?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.fab, floating ? styles.fabFloating : styles.fabInline]}>
      <DesignIcon name="plus" size={20} color={White} strokeWidth={2.2} />
      <Txt style={styles.fabText}>{label}</Txt>
    </Pressable>
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
  body: { paddingTop: 6, paddingHorizontal: 20 },
  state: { minHeight: 280, justifyContent: 'center', gap: 12 },
  fab: {
    height: 52,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 999,
    backgroundColor: Zinc[900],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabFloating: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    shadowColor: '#09090B',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabInline: { height: 48, alignSelf: 'center', marginTop: 4 },
  fabText: { fontSize: 15, fontWeight: '600', color: White },
});
