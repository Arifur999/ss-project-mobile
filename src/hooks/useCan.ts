import { useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { canDo, type Action } from '@/lib/permissions';

/** `can('products.write')` - whether to offer an action to the signed-in user. */
export function useCan() {
  const { account } = useAuth();
  const role = account?.profile?.role;
  const granted = account?.profile?.permissions;
  return useCallback((action: Action) => canDo(role, granted, action), [role, granted]);
}
