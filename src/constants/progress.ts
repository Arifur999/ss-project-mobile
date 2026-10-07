import { Amber, Green, Zinc } from '@/constants/theme';

/**
 * The website's colours for something that arrives or goes out in parts - a
 * purchase being received, a sale being delivered: orange while none has,
 * grey once some has, green when all of it has.
 */
export const PROGRESS_LOOK = {
  none: { bg: Amber[50], ink: Amber[700] },
  some: { bg: Zinc[100], ink: Zinc[700] },
  all: { bg: Green[50], ink: Green[700] },
} as const;
