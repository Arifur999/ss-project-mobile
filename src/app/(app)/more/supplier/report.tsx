import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FigureCard } from '@/components/FigureCard';
import { FigureRow } from '@/components/FiguresCard';
import { PromptCard } from '@/components/PromptCard';
import { SelectPill } from '@/components/SelectPill';
import { Txt } from '@/components/Txt';
import { Green, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPLIER_COPY } from '@/features/supplier/copy';
import { purchaseReportTable } from '@/features/supplier/purchaseReportTable';
import { SupplierShell } from '@/features/supplier/SupplierShell';
import { monthName, yearLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { printTable, shareTablePdf } from '@/lib/print';
import { smsBusiness } from '@/lib/smsTexts';
import { supplierYearlyPurchase } from '@/lib/supplierYearlyPurchase';
import { useBusinessSettings } from '@/services/business.services';
import { supplierLabel, useSupplierData } from '@/services/supplier.services';

const ALL = '__all';
// The website's year picker: five years either side of this one, newest first.
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => THIS_YEAR + 5 - i);

/**
 * A year of buying, month by month - the website's Supplier Report (Yearly
 * Purchase Overview): for one supplier or all, what was ordered, the incentive
 * given back, what that left owed, and what reached them, printed or shared as
 * the website prints it. Read from the purchases the section already holds.
 */
export default function SupplierReportScreen() {
  const t = useCopy(SUPPLIER_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const business = useBusinessSettings();
  const { data } = useSupplierData();
  const [year, setYear] = useState(THIS_YEAR);
  const [supplierId, setSupplierId] = useState(ALL);

  const suppliers = (data?.suppliers ?? []).filter((s) => s.is_active !== false);
  const report = supplierYearlyPurchase({ year, supplierId: supplierId === ALL ? '' : supplierId, purchases: data?.purchases ?? [], payments: data?.payments ?? [] });
  const chosen = suppliers.find((s) => s.id === supplierId);
  const who = supplierId === ALL ? t.allSuppliers : supplierLabel(chosen);
  const hasYearData = report.months.some((m) => m.orderValue || m.depositPaid || m.incentive);

  const output = async (share: boolean) => {
    const table = purchaseReportTable({ report, year, supplier: who, business: smsBusiness(business.data).businessName, t, lang, money });
    try {
      if (share) await shareTablePdf(table, `${t.reportTitle} ${year}`);
      else await printTable(table);
    } catch (e) {
      toast.show(errorMessage(e));
    }
  };

  return (
    <SupplierShell section="report">
      <Txt style={styles.intro}>{t.reportIntro}</Txt>
      <View style={styles.pickers}>
        <SelectPill
          shape="box"
          label={t.yearLabel}
          value={String(year)}
          onChange={(key) => setYear(Number(key))}
          options={YEARS.map((y) => ({ key: String(y), label: yearLabel(y, lang) }))}
          closeLabel={t.close}
          style={styles.year}
        />
        <SelectPill
          shape="box"
          label={t.supplierFilter}
          value={supplierId}
          onChange={setSupplierId}
          options={[{ key: ALL, label: t.allSuppliers }, ...suppliers.map((s) => ({ key: s.id, label: supplierLabel(s) }))]}
          closeLabel={t.close}
          style={styles.supplier}
        />
      </View>

      {!hasYearData ? <PromptCard icon="truck" text={t.noYearData(supplierId === ALL ? t.anybody : who, yearLabel(year, lang))} /> : null}

      <FigureCard dark label={t.ordered} value={money(report.total.orderValue)} caption={`${t.incentive} −${money(report.total.incentive)}`} />
      <View style={styles.row}>
        <FigureCard label={t.owed} value={money(report.total.actualDeposit)} />
        <FigureCard label={t.paid} value={money(report.total.depositPaid)} valueColor={Green[700]} caption={t.paidHintReport} />
      </View>

      <View style={styles.list}>
        {report.months.map((m, i) => (
          <View key={m.monthIndex} style={[styles.month, i > 0 && styles.divider]}>
            <Txt style={styles.monthName}>{monthName(m.monthIndex, lang)}</Txt>
            <FigureRow
              figures={[
                { label: t.ordered, value: money(m.orderValue) },
                { label: t.incentive, value: m.incentive ? `−${money(m.incentive)}` : money(0) },
                { label: t.owed, value: money(m.actualDeposit) },
                { label: t.paid, value: money(m.depositPaid), strong: true },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.grow}>
          <Button title={t.sharePdf} icon="share" variant="pillOutline" onPress={() => output(true)} />
        </View>
        <View style={styles.grow}>
          <Button title={t.print} icon="printer" variant="pillOutline" onPress={() => output(false)} />
        </View>
      </View>
    </SupplierShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  pickers: { flexDirection: 'row', gap: 10 },
  year: { width: 112 },
  supplier: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  month: { gap: 6, paddingVertical: 10, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  monthName: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
});
