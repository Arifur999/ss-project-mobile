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
  50: '#FAFAFA',
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
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
} as const;

export const Green = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
} as const;

export const Amber = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
} as const;

/** Profit withdrawals are drawn in blue. */
export const Blue = {
  50: '#EFF6FF',
  500: '#3B82F6',
  700: '#1D4ED8',
} as const;

/**
 * The categorical series colours of the expense charts, in the design's order.
 * Grey last: it is the "everything else" slice.
 */
export const ChartPalette = ['#18181B', '#F97316', '#EC4899', '#06B6D4', '#8B5CF6', '#14B8A6', '#10B981', '#F59E0B', '#6B7280'] as const;

/**
 * The ten colours an expense category can be given, in the website's order
 * (Hatim ExpenseDashboard PRESET_COLORS) and stored as it stores them, lower
 * case: red, amber, blue, green, purple, pink, gray, teal, orange, cyan.
 */
export const CategoryPalette = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#f97316', '#06b6d4'] as const;

/** A category with no colour is drawn gray. */
export const categoryColor = (color?: string | null) => (color && /^#[0-9a-f]{6}$/i.test(color) ? color : CategoryPalette[6]);

export const White = '#FFFFFF';

/** The dimmed backdrop behind every bottom sheet. */
export const Scrim = 'rgba(9, 9, 11, 0.45)';
