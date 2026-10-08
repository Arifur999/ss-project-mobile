import { useLocalSearchParams } from 'expo-router';

import { SaleFormScreen } from '@/features/sales/SaleFormScreen';

/** A saved sale, edited. */
export default function EditSaleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SaleFormScreen saleId={String(id)} />;
}
