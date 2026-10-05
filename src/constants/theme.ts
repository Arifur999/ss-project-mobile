// The website's palette (Hatim/tailwind.config.js), so the app and the site read
// as one product until the Figma design replaces these. Light only for now: the
// website has no dark mode, and app.json pins userInterfaceStyle to "light".

export const Colors = {
  /** Brand Dark - headings, primary buttons. */
  ink: '#0F1117',
  text: '#111827',
  textSecondary: '#6B7280',
  background: '#FFFFFF',
  /** Card fill and its edge; the edge stays darker than the fill. */
  surface: '#F4F4F4',
  border: '#E2E6EF',
  muted: '#F5F6F8',
  success: '#22C55E',
  danger: '#EF4444',
  info: '#3B82F6',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;
