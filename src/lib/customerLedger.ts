import { parseAmountText, parseMetaValue } from './customerDue';

// One customer's ledger, lifted from Hatim/src/pages/customers/
// CustomerLedger.tsx (loadSelectedLedger and its summary): sales and
// collections in date order, each sale opened into one row per product with
// the invoice's discount and payment on its last row, so the running due still
// reconciles; the due never runs below zero. The figures are the website's;
// the words for each row are left to the screen, which has two languages.

type Row = Record<string, any>;

export type LedgerEntry = {
  id: string;
  date: string;
  created_at?: string;
  entry_type: 'sale' | 'payment';
  /** The invoice number, or what a collection was recorded against. */
  reference: string;
  product_name: string | null;
  qty?: number;
  /** The account a collection went into. */
  account_name?: string;
  /** Which sale or collection the row belongs to - one per sale, however many products. */
  txIndex: number;
  previous_due: number;
  purchase: number;
  discount: number;
  payment: number;
  current_due: number;
};

export type LedgerSummary = {
  openingDue: number;
  totalPurchase: number;
  totalDiscount: number;
  totalPaid: number;
  currentDue: number;
};

const dueCollectionDiscount = (payment: Row) => parseAmountText(parseMetaValue(payment?.notes || '', 'Discount Amount'));
const saleGrossAmount = (sale: Row) => Number(sale.net_amount || 0) + Number(sale.discount_amount || 0);
const byTime = (a: Row, b: Row) =>
  new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime() || new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();

/** Oldest first - the only order the Previous Due to Current Due chain reads in. `sales` are the customer's completed ones. */
export function customerLedger(openingDue: unknown, sales: Row[], payments: Row[]): LedgerEntry[] {
  type Tx = { kind: 'sale'; date: string; created_at?: string; sale: Row } | { kind: 'payment'; date: string; created_at?: string; payment: Row };
  const transactions: Tx[] = [
    ...sales.map((sale) => ({ kind: 'sale' as const, date: sale.date, created_at: sale.created_at, sale })),
    ...payments.map((payment) => ({ kind: 'payment' as const, date: payment.date, created_at: payment.created_at, payment })),
  ].sort(byTime);

  let runningDue = Number(openingDue || 0);
  let txIndex = 0;
  const ledger: LedgerEntry[] = [];

  for (const tx of transactions) {
    txIndex += 1;
    if (tx.kind === 'payment') {
      const payment = tx.payment;
      const discount = dueCollectionDiscount(payment);
      const paid = Number(payment.amount || 0);
      const previousDue = runningDue;
      runningDue = Math.max(0, runningDue - discount - paid);
      ledger.push({
        id: payment.id,
        date: payment.date,
        created_at: payment.created_at,
        entry_type: 'payment',
        reference: payment.invoice_no || '',
        product_name: null,
        account_name: payment.account_name || '',
        txIndex,
        previous_due: previousDue,
        purchase: 0,
        discount,
        payment: paid,
        current_due: runningDue,
      });
      continue;
    }

    const sale = tx.sale;
    const items: Row[] = Array.isArray(sale.sale_items) ? sale.sale_items : [];
    const saleDiscount = Number(sale.discount_amount || 0);
    const salePayment = Number(sale.paid_amount || 0);

    // 0 or 1 product: one row, on the sale's gross.
    if (items.length <= 1) {
      const previousDue = runningDue;
      const purchase = saleGrossAmount(sale);
      runningDue = Math.max(0, runningDue + purchase - saleDiscount - salePayment);
      const onlyQty = Number(items[0]?.qty || 0);
      ledger.push({
        id: sale.id,
        date: sale.date,
        created_at: sale.created_at,
        entry_type: 'sale',
        reference: sale.invoice_no || '-',
        product_name: items[0]?.product_name || null,
        qty: onlyQty || undefined,
        txIndex,
        previous_due: previousDue,
        purchase,
        discount: saleDiscount,
        payment: salePayment,
        current_due: runningDue,
      });
      continue;
    }

    items.forEach((item, itemIndex) => {
      const isLast = itemIndex === items.length - 1;
      const linePurchase = Number(item.total_amount || 0);
      const lineDiscount = isLast ? saleDiscount : 0;
      const linePayment = isLast ? salePayment : 0;
      const previousDue = runningDue;
      runningDue = Math.max(0, runningDue + linePurchase - lineDiscount - linePayment);
      const qty = Number(item.qty || 0);
      ledger.push({
        id: `${sale.id}-${itemIndex}`,
        date: sale.date,
        created_at: sale.created_at,
        entry_type: 'sale',
        reference: sale.invoice_no || '-',
        product_name: item.product_name || null,
        qty: qty || undefined,
        txIndex,
        previous_due: previousDue,
        purchase: linePurchase,
        discount: lineDiscount,
        payment: linePayment,
        current_due: runningDue,
      });
    });
  }
  return ledger;
}

/** The ledger's summary boxes. */
export function ledgerSummary(openingDue: unknown, ledger: LedgerEntry[]): LedgerSummary {
  const opening = Number(openingDue || 0);
  const totalPurchase = ledger.reduce((sum, entry) => sum + Number(entry.purchase || 0), 0);
  const totalDiscount = ledger.reduce((sum, entry) => sum + Number(entry.discount || 0), 0);
  const totalPaid = ledger.reduce((sum, entry) => sum + Number(entry.payment || 0), 0);
  return {
    openingDue: opening,
    totalPurchase,
    totalDiscount,
    totalPaid,
    currentDue: Math.max(0, opening + totalPurchase - totalDiscount - totalPaid),
  };
}
