import { Amber, Blue, Green } from '@/constants/theme';
import type { DamageStatus } from '@/lib/damageRules';

/** The website's status pills: blue while out, orange when partly back, green once settled. */
export const DAMAGE_STATUS_LOOK: Record<DamageStatus, { bg: string; ink: string }> = {
  pending: { bg: Blue[50], ink: Blue[700] },
  partial: { bg: Amber[50], ink: Amber[700] },
  completed: { bg: Green[50], ink: Green[700] },
};
