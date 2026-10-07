import { ComingSoon } from '@/components/ComingSoon';
import { useCopy } from '@/context/LanguageContext';

const COPY = { en: { title: 'Sales' }, bn: { title: 'বিক্রি' } };

export default function SalesTab() {
  return <ComingSoon title={useCopy(COPY).title} />;
}
