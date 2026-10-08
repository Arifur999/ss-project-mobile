import { Stack } from 'expo-router';

import { tabStackOptions } from '@/lib/stackOptions';

/** The Customers tab: its four sections and the full-screen forms they open, keeping the tab bar below. */
export default function CustomersLayout() {
  return <Stack screenOptions={tabStackOptions} />;
}
