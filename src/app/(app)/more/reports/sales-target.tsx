import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FiguresCard } from '@/components/FiguresCard';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { ReportsShell } from '@/features/reports/ReportsShell';
import { SalesTargetSheet } from '@/features/reports/SalesTargetSheet';
import { useCan } from '@/hooks/useCan';
import { monthName } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { deleteSalesTarget, useTargets, useTargetWrite } from '@/services/reports.services';

type Row = Record<string, any>;

/** Every month's sales and profit target - Hatim's Monthly Target: set, edit and delete for the owner. */
export default function SalesTargetScreen() {
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

  const mayWrite = can('salesTarget.write');
  const label = (row: Row) => `${monthName(Number(row.month), lang)} ${row.year}`;
  const targets = query.data?.salesTargets ?? [];

  const openForm = (row: Row | null) => {
    setEditing(row);
    setSheet('form');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteSalesTarget(String(selected.id)));
      toast.show(t.targetDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <ReportsShell section="sales" query={query} fab={mayWrite ? { label: t.newSalesTarget, onPress: () => openForm(null) } : null}>
      <Txt style={styles.intro}>{t.salesTargetsTitle}</Txt>
      {targets.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noSalesTargets}</Txt>
        </View>
      ) : (
        targets.map((row) => (
          <FiguresCard
            key={String(row.id)}
            title={label(row)}
            figures={[
              { label: t.salesTargetLabel, value: money(row.sales_target), strong: true },
              { label: t.profitTargetLabel, value: money(row.profit_target) },
            ]}
            onPress={
              mayWrite
                ? () => {
                    setSelected(row);
                    setSheet('actions');
                  }
                : undefined
            }
          />
        ))
      )}

      <SalesTargetSheet open={sheet === 'form'} editing={editing} onClose={() => setSheet(null)} />
      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected ? label(selected) : ''}
        subtitle={selected ? `${t.salesTargetLabel} ${money(selected.sales_target)} · ${t.profitTargetLabel} ${money(selected.profit_target)}` : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        editLabel={t.edit}
        deleteLabel={t.delete}
        onEdit={() => openForm(selected)}
        onDelete={() => setSheet('delete')}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteTargetTitle(label(selected)) : ''}
        text={t.deleteTargetText}
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
