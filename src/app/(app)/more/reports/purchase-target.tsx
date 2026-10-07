import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FiguresCard } from '@/components/FiguresCard';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { PROGRESS_LOOK } from '@/constants/progress';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { bnDigits, useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { PurchaseTargetSheet } from '@/features/reports/PurchaseTargetSheet';
import { ReportsShell } from '@/features/reports/ReportsShell';
import { useCan } from '@/hooks/useCan';
import { monthShort } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { formatNumber } from '@/lib/money';
import { targetCompletion } from '@/lib/purchaseRollingTarget';
import { boughtBySupplier, monthsInRange, perMonthAmount } from '@/lib/purchaseTargets';
import { supplierLabel } from '@/services/supplier.services';
import { deletePurchaseTarget, useTargets, useTargetWrite } from '@/services/reports.services';

type Row = Record<string, any>;

/** Every buying target - Hatim's Purchase Target: each supplier's total, per month, and how far it has got. */
export default function PurchaseTargetScreen() {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useTargetWrite();
  const query = useTargets();
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<'form' | 'actions' | 'delete' | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const data = query.data;
  const bought = boughtBySupplier(data?.purchases ?? []);
  const monthLabel = (month: number, year: number) => `${monthShort(Number(month), lang)} ${lang === 'bn' ? bnDigits(String(year)) : year}`;
  const companyOf = (target: Row) => {
    const supplier = target.supplier || data?.suppliers.find((s) => s.id === target.supplier_id);
    return supplierLabel(supplier) || '-';
  };
  const mayWrite = can('purchaseTarget.write');
  const mayDelete = can('purchaseTarget.delete');

  const openForm = (row: Row | null) => {
    setEditing(row);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deletePurchaseTarget(String(selected.id)));
      toast.show(t.targetDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  const targets = data?.purchaseTargets ?? [];

  return (
    <ReportsShell section="purchase" query={query} fab={mayWrite ? { label: t.newPurchaseTarget, onPress: () => openForm(null) } : null}>
      <Txt style={styles.intro}>{t.purchaseTargetsTitle}</Txt>
      {targets.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noPurchaseTargets}</Txt>
        </View>
      ) : (
        targets.map((target) => {
          const range = {
            start_year: Number(target.start_year),
            start_month: Number(target.start_month),
            end_year: Number(target.end_year),
            end_month: Number(target.end_month),
            total_amount: Number(target.total_amount || 0),
          };
          const months = monthsInRange(range);
          const done = targetCompletion(range, bought[target.supplier_id] || {});
          return (
            <FiguresCard
              key={String(target.id)}
              title={companyOf(target)}
              meta={t.monthsSpan(monthLabel(target.start_month, target.start_year), monthLabel(target.end_month, target.end_year))}
              sub={done.finished ? undefined : t.remaining(money(done.remaining))}
              badge={done.finished ? { label: t.finished, ...PROGRESS_LOOK.all } : undefined}
              figures={[
                { label: t.totalLabel, value: money(range.total_amount) },
                { label: t.perMonthLabel, value: money(perMonthAmount(range.total_amount, months)) },
                { label: t.boughtLabel(formatNumber(Math.round(done.percent), lang)), value: money(done.achieved), strong: true },
              ]}
              onPress={
                mayWrite || mayDelete
                  ? () => {
                      setSelected(target);
                      setSheet('actions');
                    }
                  : undefined
              }
            />
          );
        })
      )}

      <PurchaseTargetSheet open={sheet === 'form'} editing={editing} onClose={() => setSheet(null)} />
      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? companyOf(selected) : ''}
        subtitle={selected ? money(selected.total_amount) : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.edit}
        deleteLabel={t.delete}
        onEdit={mayWrite ? () => openForm(selected) : undefined}
        onDelete={mayDelete ? () => setSheet('delete') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={selected ? t.deletePurchaseTargetTitle(companyOf(selected)) : ''}
        text={t.deletePurchaseTargetText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </ReportsShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
