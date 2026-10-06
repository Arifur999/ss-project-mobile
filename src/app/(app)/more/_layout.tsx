import { Stack } from 'expo-router';

/** The More tab: the menu, and the screens it opens, keeping the tab bar below. */
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
