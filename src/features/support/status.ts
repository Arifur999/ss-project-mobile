import { PROGRESS_LOOK } from '@/constants/progress';
import { Blue } from '@/constants/theme';
import type { TicketStatus } from '@/services/support.services';

/** The website's ticket badges: orange while waiting on support, blue once answered, green when solved. */
export const TICKET_LOOK: Record<TicketStatus, { bg: string; ink: string }> = {
  open: PROGRESS_LOOK.none,
  answered: { bg: Blue[50], ink: Blue[700] },
  solved: PROGRESS_LOOK.all,
};
