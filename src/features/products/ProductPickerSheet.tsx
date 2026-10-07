import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
import { SearchField } from '@/components/SearchField';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { PRODUCT_COPY } from '@/features/products/copy';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { pagedRows } from '@/services/paged.services';
import { useProducts, type Product } from '@/services/products.services';

/**
 * Choosing one product from the whole catalogue: a search box searched on the
 * server as the user pauses, and the matches with photo, name and code -
 * forty at a time, and an optional line of the form's own under each (a sale
 * shows the price). For any form that needs a product.
 */
export function ProductPickerSheet({
  open,
  title,
  onClose,
  onPick,
  detail,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (product: Product) => void;
  detail?: (product: Product) => string;
}) {
  const t = useCopy(PRODUCT_COPY);
  const [search, setSearch] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  // Each opening starts with an empty search.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSearch('');
  }
  const term = useDebouncedValue(search.trim());
  const query = useProducts(term);
  const rows = pagedRows(query.data?.pages);

  return (
    <BottomSheet open={open} onClose={onClose} gap={10} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {title}
      </Txt>
      <SearchField value={search} onChangeText={setSearch} placeholder={t.searchPlaceholder} label={t.searchLabel} height={50} />
      {query.isPending ? (
        <View style={styles.state}>
          <Spinner color={Zinc[900]} size={22} />
        </View>
      ) : rows.length === 0 ? (
        <Txt style={styles.empty}>{term ? t.emptySearch(term) : t.emptyAll}</Txt>
      ) : (
        rows.map((product) => (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            accessibilityLabel={`${product.name}, ${product.product_code}`}
            onPress={() => {
              onPick(product);
              onClose();
            }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <ProductImage url={product.image_url} size={44} radius={10} />
            <View style={styles.body}>
              <Txt style={styles.name} numberOfLines={1}>
                {product.name}
              </Txt>
              <Txt style={styles.code} numberOfLines={1}>
                {[product.product_code, product.category].filter(Boolean).join(' · ')}
              </Txt>
              {detail ? (
                <Txt style={styles.detail} numberOfLines={1}>
                  {detail(product)}
                </Txt>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
      {query.hasNextPage && !query.isPlaceholderData ? (
        <Button title={t.showMore} variant="pillOutline" onPress={() => query.fetchNextPage()} busy={query.isFetchingNextPage} />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 6, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900] },
  state: { paddingVertical: 24, alignItems: 'center' },
  empty: { paddingVertical: 20, textAlign: 'center', fontSize: 14, color: Zinc[600] },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Zinc[200],
    backgroundColor: White,
  },
  pressed: { backgroundColor: Zinc[50] },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  code: { fontSize: 13, color: Zinc[500] },
  detail: { fontSize: 13, fontWeight: '600', color: Zinc[900] },
});
