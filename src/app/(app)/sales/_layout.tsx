import { Stack } from 'expo-router';

import { tabStackOptions } from '@/lib/stackOptions';

/** The Sales tab: its sections and the New sale form, keeping the tab bar below. */
export default function SalesLayout() {
  return <Stack screenOptions={tabStackOptions} />;
}
