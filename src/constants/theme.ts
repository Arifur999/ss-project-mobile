// Colours exactly as the Figma screens use them. Two greys, on purpose: the
// sign-in screens are drawn in Tailwind's slate (a cool, faintly blue grey) and
// everything after sign-in in zinc (neutral). Keep each screen on its own ramp -
// mixing them is visible side by side.

export const Slate = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  900: '#0F172A',
} as const;

export const Zinc = {
  100: '#F4F4F5',
  200: '#E4E4E7',
  300: '#D4D4D8',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  900: '#18181B',
  /** The near-black of the dark cards (Net Profit, Cashflow, totals). */
  950: '#111113',
} as const;

export const Red = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
} as const;

export const Green = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
} as const;

export const Amber = {
  100: '#FEF3C7',
  800: '#92400E',
} as const;

export const White = '#FFFFFF';

/** The dimmed backdrop behind every bottom sheet. */
export const Scrim = 'rgba(9, 9, 11, 0.45)';
