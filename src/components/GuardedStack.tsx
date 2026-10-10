import { Stack } from 'expo-router';

import { useReach } from '@/hooks/useCan';
import { screensIn } from '@/lib/permissions';
import { tabStackOptions } from '@/lib/stackOptions';

/**
 * A tab's stack whose screens open only for a member the website's page ticks
 * allow (ROUTE_ACCESS), as its route guard does there. A refused screen cannot
 * be navigated to - a link from elsewhere falls back to the first screen of the
 * stack this member may open - and one open when its tick is taken away is
 * left at once. The screens are declared in ROUTE_ACCESS order, so that
 * fallback is a section's first page rather than a form or a record's screen.
 */
export function GuardedStack({ folder }: { folder: string }) {
  const reach = useReach();
  return (
    <Stack screenOptions={tabStackOptions}>
      {screensIn(folder).map((screen) => (
        <Stack.Protected key={screen} guard={reach.screen(screen)}>
          <Stack.Screen name={screen.slice(folder.length + 1)} />
        </Stack.Protected>
      ))}
    </Stack>
  );
}
