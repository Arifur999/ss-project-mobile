// The signed-in account, as /auth/me, /auth/login and /auth/verify-otp return it.
// Types and rules lifted from Hatim/src/context/AuthContext.tsx so the app and
// the website agree on who is locked out and what name is shown.

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'sales_staff' | 'accountant';
export type SubscriptionStatus = 'pending' | 'trial' | 'active' | 'expired' | 'blocked' | 'suspended';
export type PlanType = 'free_trial' | 'monthly' | 'yearly';
export type PlanStatus = 'active' | 'expired' | 'suspended';
export type EffectiveSubscriptionStatus = SubscriptionStatus | 'none';

export interface Profile {
  id: string;
  owner_id?: string | null;
  full_name: string;
  email?: string;
  role: UserRole;
  phone: string;
  is_active: boolean;
  /** What this user may do within their role. Empty = everything the role allows. */
  permissions?: string[];
}

export interface OwnerSubscription {
  id: string;
  owner_id: string;
  business_name: string;
  owner_email: string;
  status: SubscriptionStatus;
  plan: string;
  plan_type?: PlanType | null;
  plan_status?: PlanStatus | null;
  expiry_date?: string | null;
  blocked_reason?: string;
  /** Whether the one free trial has been started. */
  trial_used?: boolean | null;
  address?: string | null;
}

export interface Account {
  user: { id: string; email: string };
  profile: Profile | null;
  subscription: OwnerSubscription | null;
}

export function effectiveSubscriptionStatus(subscription: OwnerSubscription | null): EffectiveSubscriptionStatus {
  if (!subscription) return 'none';
  if (subscription.plan_status === 'suspended') return 'suspended';
  if (subscription.plan_status === 'expired') return 'expired';
  if (
    subscription.plan_status === 'active' &&
    subscription.expiry_date &&
    new Date(subscription.expiry_date).getTime() <= Date.now()
  )
    return 'expired';
  if (subscription.plan_status === 'active') return 'active';
  if (subscription.status === 'pending') return 'pending';
  if (subscription.status === 'blocked') return 'blocked';
  if (subscription.status === 'active') return 'active';
  if (subscription.status === 'trial') return 'active';
  return subscription.status;
}

/** An owner whose plan does not let them in. Team members are stopped server-side. */
export function isSubscriptionLocked(account: Account | null): boolean {
  if (account?.profile?.role !== 'owner') return false;
  const status = effectiveSubscriptionStatus(account.subscription);
  return status !== 'active' && status !== 'trial';
}

/**
 * Whether a locked owner may still start the free trial - the server's own
 * rule (subscription.service choosePlan): never started, and no paid plan
 * chosen. A new registration is exactly this: modelled as expired, with the
 * trial unused, as the website's /choose-plan expects.
 */
export function canStartTrial(account: Account | null): boolean {
  if (!isSubscriptionLocked(account)) return false;
  const subscription = account?.subscription;
  return !!subscription && !subscription.trial_used && subscription.plan_type !== 'monthly' && subscription.plan_type !== 'yearly';
}

export function displayName(account: Account | null): string {
  const profile = account?.profile;
  if (profile?.role === 'owner') {
    return account?.subscription?.business_name || profile.full_name || account?.user.email || 'Owner';
  }
  return profile?.full_name || account?.user.email || 'Owner';
}
