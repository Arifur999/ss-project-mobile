import { Stack } from 'expo-router';

/** The Sales tab: its sections and the New sale form, keeping the tab bar below. */
export default function SalesLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
