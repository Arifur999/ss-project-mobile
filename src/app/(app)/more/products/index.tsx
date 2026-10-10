import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { ListScreen } from '@/components/ListScreen';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PRODUCT_COPY } from '@/features/products/copy';
import { PRICE_COPY } from '@/features/products/priceCopy';
import { ProductCard } from '@/features/products/ProductCard';
import { ProductDetailSheet } from '@/features/products/ProductDetailSheet';
import { useCan, useReach } from '@/hooks/useCan';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { pagedRows } from '@/services/paged.services';
import { deleteProduct, getProductUsage, useProductWrite, useProducts, type Product } from '@/services/products.services';

/** The catalogue - Hatim's Product List: search, every product a page at a time, add, edit, delete. */
export default function ProductListScreen() {
  const t = useCopy(PRODUCT_COPY);
  const price = useCopy(PRICE_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const can = useCan();
  const reach = useReach();
  const write = useProductWrite();

  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const query = useProducts(term);
  const rows = pagedRows(query.data?.pages);
  const total = query.data?.pages.at(-1)?.total ?? 0;

  const [selected, setSelected] = useState<Product | null>(null);
  const [sheet, setSheet] = useState<'detail' | 'confirm' | null>(null);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Kept stable by the React Compiler, so the memoised cards do not re-render.
  const open = (product: Product) => {
    setSelected(product);
    setSheet('detail');
  };

  // As the website asks first: a product in any sale or purchase stays, so that history stays whole.
  const askDelete = async () => {
    if (!selected || checking) return;
    setChecking(true);
    try {
      const usage = await getProductUsage(selected.id);
      if (usage.sales > 0 || usage.purchases > 0) {
        setSheet(null);
        toast.show(t.linked);
      } else {
        setSheet('confirm');
      }
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteProduct(selected.id));
      setSheet(null);
      toast.show(t.productDeleted(selected.name));
    } catch (e) {
      setSheet(null);
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const edit = (product: Product) => {
    setSheet(null);
    router.push({ pathname: '/more/products/form', params: { id: product.id } });
  };

  return (
    <ListScreen
      title={t.title}
      onBack={() => router.navigate('/more')}
      backLabel={t.backToMenu}
      header={
        <>
          {can('products.updatePrice') ? (
            <Button title={price.entry} icon="percent" variant="pillOutline" onPress={() => router.push('/more/products/update-price')} />
          ) : null}
          <SearchField value={search} onChangeText={setSearch} placeholder={t.searchPlaceholder} label={t.searchLabel} height={50} />
          {query.isSuccess ? <Txt style={styles.count}>{t.count(total, formatNumber(total, lang))}</Txt> : null}
        </>
      }
      rows={rows}
      keyOf={(product) => product.id}
      renderRow={({ item }) => <ProductCard product={item} onPress={open} />}
      query={query}
      emptyText={term ? t.emptySearch(term) : t.emptyAll}
      errorText={() => t.loadError}
      retryLabel={t.retry}
      fab={can('products.write') ? { label: t.newProduct, onPress: () => router.push('/more/products/form') } : null}>
      <ProductDetailSheet
        product={sheet === 'detail' ? selected : null}
        onClose={() => setSheet(null)}
        onStock={
          reach.href('/inventory')
            ? () => {
                setSheet(null);
                if (selected) router.navigate({ pathname: '/inventory', params: { search: selected.product_code } });
              }
            : undefined
        }
        onEdit={can('products.write') && selected ? () => edit(selected) : undefined}
        onDelete={can('products.delete') ? askDelete : undefined}
        deleteBusy={checking}
      />
      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteTitle(selected.name) : ''}
        text={t.deleteText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontWeight: '500', color: Zinc[500] },
});
