import { Amber, Green, Zinc } from '@/constants/theme';
import type { ReceiveState } from '@/lib/purchaseOrder';

/** The website's order status colours: orange while pending, grey when partly in, green once received. */
export const RECEIVE_LOOK: Record<ReceiveState, { bg: string; ink: string }> = {
  pending: { bg: Amber[50], ink: Amber[700] },
  partial: { bg: Zinc[100], ink: Zinc[700] },
  received: { bg: Green[50], ink: Green[700] },
};

/** A purchase's shipping_status, read safely - anything unknown counts as pending. */
export const shippingState = (status: unknown): ReceiveState => (status === 'received' || status === 'partial' ? status : 'pending');
