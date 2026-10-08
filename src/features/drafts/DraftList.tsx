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
import { DRAFT_COPY } from '@/features/drafts/copy';
import { dateLabel } from '@/lib/dates';
import type { DraftKind } from '@/lib/draftPayload';
import { errorMessage } from '@/lib/httpClient';
import { deleteDraft, useDraftWrite, type Draft } from '@/services/drafts.services';

/**
 * One kind's parked forms - the website's DraftList, which its Draft Sales
 * and Draft Purchase pages share: each one's customer or supplier, number,
 * what it comes to and who touched it last, opened on its form to carry on
 * (by whoever may make one) or thrown away after a confirm. Inside the
 * section's own frame, which loads the list.
 */
export function DraftList({
  kind,
  drafts,
  formRoute,
  mayOpen,
  mayDelete,
}: {
  kind: DraftKind;
  drafts: Draft[];
  /** The form a draft opens on, given ?draft=<id>. */
  formRoute: string;
  mayOpen: boolean;
  mayDelete: boolean;
}) {
  const t = useCopy(DRAFT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const toast = useToast();
  const write = useDraftWrite(kind);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const titleOf = (draft: Draft | null) => draft?.title || t.untitled[kind];
  const edited = (draft: Draft) => t.edited(draft.updated_by_name || draft.created_by_name, dateLabel(String(draft.updated_at).slice(0, 10), lang));

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteDraft(selected.id));
      toast.show(t.deleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  return (
    <>
      <Txt style={styles.intro}>{t.intro[kind]}</Txt>
      {drafts.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyText}>{t.noDrafts}</Txt>
        </View>
      ) : (
        drafts.map((draft) => (
          <FiguresCard
            key={draft.id}
            title={titleOf(draft)}
            meta={draft.subtitle}
            sub={edited(draft)}
            figures={[{ label: t.amount[kind], value: money(draft.amount), strong: true }]}
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
        title={titleOf(selected)}
        subtitle={selected ? [selected.subtitle, edited(selected)].filter(Boolean).join(' · ') : ''}
        cancelLabel={t.close}
        closeLabel={t.close}
        extra={
          mayOpen && selected
            ? [
                {
                  label: t.open,
                  icon: 'pencil',
                  onPress: () => {
                    setSheet(null);
                    router.push({ pathname: formRoute, params: { draft: selected.id } });
                  },
                },
              ]
            : []
        }
        deleteLabel={t.deleteDraft}
        onDelete={mayDelete ? () => setSheet('delete') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={t.deleteTitle}
        text={t.deleteText(titleOf(selected))}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: Zinc[600] },
  empty: { paddingVertical: 28, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Zinc[300] },
  emptyText: { textAlign: 'center', fontSize: 14, color: Zinc[600] },
});
