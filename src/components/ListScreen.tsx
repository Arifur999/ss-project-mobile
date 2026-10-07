import { useState, type ReactElement, type ReactNode } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Fab } from '@/components/SectionShell';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';

/** The parts of an infinite query this screen reads. */
type PagedState = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  /** The previous search's rows, shown while this one loads. */
  isPlaceholderData: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => Promise<unknown>;
};

/**
 * A screen over a long, paged list (the product catalogue, the stock list):
 * the in-app header, whatever sits above the rows (search, filters, totals),
 * then a virtualised list that asks for the next page near its end. Only the
 * rows on screen are drawn, so thousands of products scroll as smoothly on a
 * cheap phone as forty. Loading, failure and "nothing here" all show below the
 * header, which stays put - so a search box keeps its focus while it searches.
 */
export function ListScreen<T>({
  title,
  onBack,
  backLabel,
  right,
  header,
  rows,
  renderRow,
  keyOf,
  query,
  emptyText,
  errorText,
  retryLabel,
  fab,
  children,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  header?: ReactElement;
  rows: T[];
  renderRow: ListRenderItem<T>;
  keyOf: (row: T) => string;
  query: PagedState;
  emptyText: string;
  errorText: (error: unknown) => string;
  retryLabel: string;
  fab?: { label: string; onPress: () => void } | null;
  /** Sheets and dialogs the screen opens over the list. */
  children?: ReactNode;
}) {
  // Only a pull shows the refresh spinner; a background refetch stays quiet.
  const [pulling, setPulling] = useState(false);
  const refresh = async () => {
    setPulling(true);
    try {
      await query.refetch();
    } finally {
      setPulling(false);
    }
  };

  const status = query.isPending ? (
    <View style={styles.state}>
      <Spinner color={Zinc[900]} size={24} />
    </View>
  ) : query.isError && rows.length === 0 ? (
    <View style={styles.state}>
      <AlertBanner tone="error">{errorText(query.error)}</AlertBanner>
      <Button title={retryLabel} variant="pillOutline" onPress={() => query.refetch()} />
    </View>
  ) : (
    <View style={styles.empty}>
      <Txt style={styles.emptyText}>{emptyText}</Txt>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={title} onBack={onBack} backLabel={backLabel} right={right} />
      <FlatList
        data={query.isPending ? [] : rows}
        renderItem={renderRow}
        keyExtractor={keyOf}
        ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : null}
        ListEmptyComponent={status}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.more}>
              <Spinner color={Zinc[900]} size={20} />
            </View>
          ) : null
        }
        ItemSeparatorComponent={Gap}
        contentContainerStyle={[styles.content, { paddingBottom: fab ? 96 : 24 }]}
        onEndReached={() => {
          // Never page a list that is still the previous search's stand-in.
          if (query.hasNextPage && !query.isFetchingNextPage && !query.isPlaceholderData) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} tintColor={Zinc[900]} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
      />
      {fab && !query.isPending ? <Fab label={fab.label} onPress={fab.onPress} /> : null}
      {children}
    </SafeAreaView>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  content: { paddingTop: 6, paddingHorizontal: 20, flexGrow: 1 },
  header: { gap: 12, marginBottom: 12 },
  gap: { height: 10 },
  state: { minHeight: 240, justifyContent: 'center', gap: 12 },
  empty: { paddingVertical: 32, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
  more: { paddingVertical: 16, alignItems: 'center' },
});
