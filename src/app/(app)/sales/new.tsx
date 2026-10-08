import { useLocalSearchParams } from 'expo-router';

import { SaleFormScreen } from '@/features/sales/SaleFormScreen';

/** A new sale - or, given ?draft=, a parked one carried on. */
export default function NewSaleScreen() {
  const { draft } = useLocalSearchParams<{ draft?: string }>();
  return <SaleFormScreen draftId={draft || undefined} />;
}
