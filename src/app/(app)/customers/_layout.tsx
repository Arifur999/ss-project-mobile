import { Stack } from 'expo-router';

/** The Customers tab: its four sections and the full-screen forms they open, keeping the tab bar below. */
export default function CustomersLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
