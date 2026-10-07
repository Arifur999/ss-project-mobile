import { PROGRESS_LOOK } from '@/constants/progress';
import type { ReceiveState } from '@/lib/purchaseOrder';

/** The website's order status colours: orange while pending, grey when partly in, green once received. */
export const RECEIVE_LOOK: Record<ReceiveState, { bg: string; ink: string }> = {
  pending: PROGRESS_LOOK.none,
  partial: PROGRESS_LOOK.some,
  received: PROGRESS_LOOK.all,
};

/** A purchase's shipping_status, read safely - anything unknown counts as pending. */
export const shippingState = (status: unknown): ReceiveState => (status === 'received' || status === 'partial' ? status : 'pending');
