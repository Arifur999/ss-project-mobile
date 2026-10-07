import { PROGRESS_LOOK } from '@/constants/progress';
import type { DeliveryState } from '@/lib/saleFigures';

/** The website's delivery colours: orange while nothing has gone out, grey when some has, green once all has. */
export const DELIVERY_LOOK: Record<DeliveryState, { bg: string; ink: string }> = {
  pending: PROGRESS_LOOK.none,
  partial: PROGRESS_LOOK.some,
  delivered: PROGRESS_LOOK.all,
};
