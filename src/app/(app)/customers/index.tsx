import { ComingSoon } from '@/components/ComingSoon';
import { useCopy } from '@/context/LanguageContext';

const COPY = { en: { title: 'Customers' }, bn: { title: 'কাস্টমার' } };

export default function CustomersTab() {
  return <ComingSoon title={useCopy(COPY).title} />;
}
