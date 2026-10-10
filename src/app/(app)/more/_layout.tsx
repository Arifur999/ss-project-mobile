import { GuardedStack } from '@/components/GuardedStack';

/** The More tab: the menu, and the screens it opens, keeping the tab bar below. */
export default function MoreLayout() {
  return <GuardedStack folder="more" />;
}
