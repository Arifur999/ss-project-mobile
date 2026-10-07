import { Green, Red, Zinc } from '@/constants/theme';

// Which side of an account a balance is on - a loan, a supplier - and how
// every screen colours it.
// Signed as the website signs it (loanUtils.loanBalanceLabel): positive is
// Pawna - they owe us - negative is Dena - we owe them.

export type Side = 'pawna' | 'dena' | 'balanced';

export const sideOf = (balance: number): Side => (balance > 0 ? 'pawna' : balance < 0 ? 'dena' : 'balanced');

export const SIDE_LOOK: Record<Side, { chipBg: string; chipInk: string; amount: string; ink: string; onDark: string }> = {
  pawna: { chipBg: Green[100], chipInk: Green[800], amount: Green[700], ink: Green[700], onDark: Green[300] },
  dena: { chipBg: Red[100], chipInk: Red[800], amount: Red[600], ink: Red[600], onDark: Red[300] },
  // A settled figure is plain black in a list, grey where it labels a balance.
  balanced: { chipBg: Zinc[100], chipInk: Zinc[600], amount: Zinc[900], ink: Zinc[600], onDark: 'rgba(255, 255, 255, 0.75)' },
};
