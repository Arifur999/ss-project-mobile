import { Stack } from 'expo-router';

import { tabStackOptions } from '@/lib/stackOptions';

/** The More tab: the menu, and the screens it opens, keeping the tab bar below. */
export default function MoreLayout() {
  return <Stack screenOptions={tabStackOptions} />;
}
