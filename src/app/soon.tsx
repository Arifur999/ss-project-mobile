import { router, useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/ComingSoon';

/**
 * A full-screen stand-in for a destination the design does not draw yet,
 * opened over the tabs: /soon?title=Notifications.
 */
export default function SoonScreen() {
  const { title = '' } = useLocalSearchParams<{ title: string }>();
  return <ComingSoon title={title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
