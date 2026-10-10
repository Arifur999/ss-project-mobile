import { GuardedStack } from '@/components/GuardedStack';

/** The Customers tab: its four sections and the full-screen forms they open, keeping the tab bar below. */
export default function CustomersLayout() {
  return <GuardedStack folder="customers" />;
}
