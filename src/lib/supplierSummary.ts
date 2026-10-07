import { firstAmount, roundTaka } from './money';
import { paidOnPurchaseBills, purchaseItemDeposit, supplierBalance, supplierOpeningBalance } from './purchaseAmounts';

// Each supplier's account, lifted line for line from Hatim/src/pages/purchase/
// SupplierDashboard.tsx loadData, so the app's figures are the website's.

type Row = Record<string, any>;

export type SupplierAccount = {
  supplier: Row;
  /** Signed: positive is Pawna (they owe us), negative Dena (we owe them). */
  openingBalance: number;
  totalDpAmount: number;
  regularDiscount: number;
  orderAmount: number;
  specialDiscount: number;
  /** What was ordered, less the SP incentive: what is owed for it. */
  actualAmount: number;
  /** Settled on the bills plus everything sent afterwards. */
  paymentAmount: number;
  /** Negative means we owe them. */
  availableBalance: number;
};

export function supplierAccounts(suppliers: Row[], purchases: Row[], payments: Row[]): SupplierAccount[] {
  return suppliers
    .map((sup) => {
      const supplierPurchases = purchases.filter((p) => p.supplier_id === sup.id);
      const supplierItems = supplierPurchases.flatMap((purchase) => purchase.purchase_items || []);
      const supplierPaymentRows = payments.filter((p) => p.supplier_id === sup.id);
      const totalDpAmount = supplierItems.reduce((sum, item) => sum + roundTaka(roundTaka(item.dp_price) * Number(item.qty || 0)), 0);
      const regularDiscount = supplierItems.reduce((sum, item) => {
        const dpPrice = roundTaka(item.dp_price);
        const actual = firstAmount(item.actual_dp, dpPrice);
        return sum + Math.max(0, roundTaka((dpPrice - actual) * Number(item.qty || 0)));
      }, 0);
      return {
        supplier: sup,
        openingBalance: supplierOpeningBalance(sup),
        totalDpAmount,
        regularDiscount,
        orderAmount: totalDpAmount - regularDiscount,
        specialDiscount: supplierItems.reduce((sum, item) => sum + roundTaka(item.sp_amount), 0),
        actualAmount: supplierItems.reduce((sum, item) => sum + purchaseItemDeposit(item), 0),
        paymentAmount: supplierPaymentRows.reduce((sum, payment) => sum + roundTaka(payment.amount), 0) + paidOnPurchaseBills(supplierPurchases),
        availableBalance: supplierBalance({ supplier: sup, items: supplierItems, payments: supplierPaymentRows, purchases: supplierPurchases }),
      };
    })
    .sort((a, b) => a.availableBalance - b.availableBalance);
}

/** The dashboard's three totals: everything owed to suppliers, bought, and paid. */
export function supplierTotals(accounts: SupplierAccount[]) {
  return {
    totalDue: accounts.filter((a) => a.availableBalance < 0).reduce((sum, a) => sum + Math.abs(a.availableBalance), 0),
    totalPurchase: accounts.reduce((sum, a) => sum + a.actualAmount, 0),
    totalPaid: accounts.reduce((sum, a) => sum + a.paymentAmount, 0),
  };
}
