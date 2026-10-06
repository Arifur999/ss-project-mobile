import { ComingSoon } from '@/components/ComingSoon';
import { useCopy } from '@/context/LanguageContext';

const COPY = { en: { title: 'Inventory' }, bn: { title: 'ইনভেন্টরি' } };

export default function InventoryTab() {
  return <ComingSoon title={useCopy(COPY).title} />;
}
