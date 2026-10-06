// The loan SMS texts, word for word as Hatim/src/lib/smsTemplates.ts writes
// them, so a customer gets the same message whether the shop used the website
// or the app. The rule that matters: the balance is signed the way every loan
// screen signs it - positive means they owe us ("Your Due Balance"), negative
// means we owe them ("Your Current Balance") - and it is always the principal.

const smsAmount = (value: number) => Math.round(Number(value) || 0).toLocaleString('en-US');

/** Settings keeps both business phones as "0171..., 0172..."; only the first goes out. */
const helplineNumber = (phone?: string) => String(phone || '').split(',')[0].trim();

function balanceLine(principal: number): string {
  const balance = Math.round(Number(principal) || 0);
  const label = balance > 0 ? 'Your Due Balance' : 'Your Current Balance';
  return `\u{1F4B3} ${label}: Tk ${smsAmount(Math.abs(balance))}`;
}

export type LoanSmsBusiness = { businessName: string; businessPhone?: string };

/** Sent when a bank/person account is opened, so they have the number in writing. */
export function buildLoanAccountSms(input: LoanSmsBusiness & { customerName: string; principal: number }): string {
  const helpline = helplineNumber(input.businessPhone);
  return [
    input.businessName,
    `Dear ${input.customerName}, your account has been created successfully.`,
    balanceLine(input.principal),
    helpline ? `Helpline: ${helpline}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Sent after a loan transaction is saved. */
export function buildLoanTransactionSms(
  input: LoanSmsBusiness & { customerName: string; amount: number; principalAfter: number },
): string {
  const helpline = helplineNumber(input.businessPhone);
  return [
    input.businessName,
    `Dear ${input.customerName}, your transaction of Tk ${smsAmount(input.amount)} has been processed.`,
    balanceLine(input.principalAfter),
    helpline ? `Helpline: ${helpline}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The balance reminder the loan overview sends: the account message's balance
 * line under the shop's name, which is all a reminder needs to say.
 */
export function buildLoanBalanceSms(input: LoanSmsBusiness & { customerName: string; principal: number }): string {
  const helpline = helplineNumber(input.businessPhone);
  return [input.businessName, `Dear ${input.customerName},`, balanceLine(input.principal), helpline ? `Helpline: ${helpline}` : '']
    .filter(Boolean)
    .join('\n');
}

/**
 * The shop's own name and helpline from Business Info, as the website fills
 * them in: these land on a customer's phone, and they know who they deal with.
 */
export function smsBusiness(settings: { name_en?: string | null; name_bn?: string | null; phone?: string | null } | null | undefined): LoanSmsBusiness {
  return {
    businessName: String(settings?.name_en || settings?.name_bn || '').trim() || 'Furnify',
    businessPhone: String(settings?.phone || ''),
  };
}
