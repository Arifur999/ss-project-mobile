import { GuardedStack } from '@/components/GuardedStack';

/** The Sales tab: its sections and the New sale form, keeping the tab bar below. */
export default function SalesLayout() {
  return <GuardedStack folder="sales" />;
}
