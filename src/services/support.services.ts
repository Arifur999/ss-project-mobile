import { useQuery } from '@tanstack/react-query';

import { http } from '@/lib/httpClient';
import { supportNumberOrFallback } from '@/lib/support';

/**
 * The support number the super admin set, or the built-in one - read once and
 * kept, since it changes about never. A failure is no matter: the fallback is
 * a real number.
 */
export function useSupportNumber(): string {
  const query = useQuery({
    queryKey: ['support-number'],
    queryFn: async () => (await http.get<{ support_number?: string | null }>('/platform-settings/payment-info'))?.support_number ?? null,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  return supportNumberOrFallback(query.data);
}
