import { useCallback, useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';
import { canDo, canReach, firstReachable, screenOf, type Action } from '@/lib/permissions';

/** `can('products.write')` - whether to offer an action to the signed-in user. */
export function useCan() {
  const { account } = useAuth();
  const role = account?.profile?.role;
  const granted = account?.profile?.permissions;
  return useCallback((action: Action) => canDo(role, granted, action), [role, granted]);
}

/**
 * Which screens the signed-in user may open, by the website's page ticks:
 * `reach.href('/more/balance')` for a link or chip, `reach.screen('sales/new')`
 * for a navigator's screen, `reach.first('more/loans')` for where a menu tile
 * or tab lands (null when nothing in it is theirs).
 */
export function useReach() {
  const { account } = useAuth();
  const role = account?.profile?.role;
  const granted = account?.profile?.permissions;
  return useMemo(
    () => ({
      screen: (screen: string) => canReach(role, granted, screen),
      href: (href: string) => canReach(role, granted, screenOf(href)),
      first: (folder: string) => firstReachable(role, granted, folder),
    }),
    [role, granted],
  );
}
