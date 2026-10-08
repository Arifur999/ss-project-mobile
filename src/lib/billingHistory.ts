// The billing history, lifted from Hatim/src/pages/BillingHistory.tsx: plan
// payments and SMS package purchases in one list, newest first. The wording of
// each line is left to the screen, which has two languages.

type Row = Record<string, any>;

export type BillingKind = 'plan' | 'sms';

export type BillingRow = {
  id: string;
  kind: BillingKind;
  date: string;
  invoice: string;
  /** For a plan payment. */
  planType?: string;
  /** For an SMS purchase. */
  packageName?: string;
  smsCount?: number;
  amount: number;
  status: string;
  trxId: string;
};

export function billingRows(planPayments: Row[], smsPurchases: Row[]): BillingRow[] {
  const plans = planPayments.map((p): BillingRow => ({
    id: `plan-${p.id}`,
    kind: 'plan',
    date: String(p.date || p.created_at || ''),
    invoice: p.invoice_no || '-',
    planType: p.plan_type || '',
    amount: Number(p.amount || 0),
    status: p.status || 'pending',
    trxId: p.trx_id || '-',
  }));
  const sms = smsPurchases.map((s): BillingRow => ({
    id: `sms-${s.id}`,
    kind: 'sms',
    date: String(s.date || s.created_at || ''),
    invoice: s.invoice_no || '-',
    packageName: s.package_name || '',
    smsCount: Number(s.sms_count || 0),
    amount: Number(s.amount || 0),
    status: s.status || 'pending',
    trxId: s.trx_id || '-',
  }));
  return [...plans, ...sms].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
