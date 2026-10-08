import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FiguresCard } from '@/components/FiguresCard';
import { ActionsSheet, ConfirmDeleteSheet } from '@/components/ItemSheets';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SALES_COPY } from '@/features/sales/copy';
import { SalesShell } from '@/features/sales/SalesShell';
import { useCan } from '@/hooks/useCan';
import { dateLabel } from '@/lib/dates';
import { errorMessage } from '@/lib/httpClient';
import { deleteDraft, useDraftWrite, useDrafts, type Draft } from '@/services/drafts.services';

/**
 * The parked invoices - the website's Draft Sales: each one's customer,
 * invoice number, what it comes to and who touched it last, opened to carry
 * on (by whoever may make a sale) or thrown away.
 */
export default function SaleDraftsScreen() {
  const t = useCopy(SALES_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const can = useCan();
  const write = useDraftWrite('sale');
  const query = useDrafts('sale');
  const [selected, setSelected] = useState<Draft | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const drafts = query.data ?? [];

  const edited = (draft: Draft) => t.draftEdited(draft.updated_by_name || draft.created_by_name, dateLabel(String(draft.updated_at).slice(0, 10), lang));

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteDraft(selected.id));
      toast.show(t.draftDeleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <SalesShell section="drafts" query={query}>
      <Txt style={styles.intro}>{t.draftsIntro}</Txt>
      {drafts.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noDrafts}</Txt>
        </View>
      ) : (
        drafts.map((draft) => (
          <FiguresCard
            key={draft.id}
            title={draft.title || t.walkIn}
            meta={draft.subtitle}
            sub={edited(draft)}
            figures={[{ label: t.payable, value: money(draft.amount), strong: true }]}
            onPress={() => {
              setSelected(draft);
              setSheet('actions');
            }}
          />
        ))
      )}

      <ActionsSheet
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        title={selected?.title || t.walkIn}
        subtitle={selected ? [selected.subtitle, edited(selected)].filter(Boolean).join(' · ') : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        extra={
          can('sale.create') && selected
            ? [
                {
                  label: t.openDraft,
                  icon: 'pencil',
                  onPress: () => {
                    setSheet(null);
                    router.push({ pathname: '/sales/new', params: { draft: selected.id } });
                  },
                },
              ]
            : []
        }
        deleteLabel={t.deleteDraft}
        onDelete={can('draft.write') ? () => setSheet('delete') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={t.deleteDraftTitle}
        text={t.deleteDraftText(selected?.title || t.walkIn)}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </SalesShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
