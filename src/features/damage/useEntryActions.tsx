import { router } from 'expo-router';
import { useState } from 'react';

import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import { DamageEntrySheet } from '@/features/damage/DamageEntrySheet';
import { useCan } from '@/hooks/useCan';
import { errorMessage } from '@/lib/httpClient';
import { deleteDamageEntry, useDamageWrite, type DamageEntry } from '@/services/damage.services';

/**
 * Opening a damage entry from any list - the Overview's latest, the Entries
 * list - and what can be done from it: go and receive what is still out, or
 * delete it (the server refuses once anything has been received, and says so).
 * Render `sheets`; call `open(entry)`.
 */
export function useEntryActions() {
  const t = useCopy(DAMAGE_COPY);
  const toast = useToast();
  const can = useCan();
  const write = useDamageWrite();
  const [selected, setSelected] = useState<DamageEntry | null>(null);
  const [sheet, setSheet] = useState<'detail' | 'confirm' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = (entry: DamageEntry) => {
    setSelected(entry);
    setSheet('detail');
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await write(() => deleteDamageEntry(selected.id));
      toast.show(t.deleted);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDeleting(false);
      setSheet(null);
    }
  };

  const sheets = (
    <>
      <DamageEntrySheet
        entry={sheet === 'detail' ? selected : null}
        onClose={() => setSheet(null)}
        onReceive={
          can('damage.receive') && selected
            ? () => {
                setSheet(null);
                router.replace({ pathname: '/more/damage/receive', params: { search: selected.doc_no } });
              }
            : undefined
        }
        onDelete={can('damage.delete') ? () => setSheet('confirm') : undefined}
      />
      <ConfirmDeleteSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={selected ? t.deleteTitle(selected.doc_no) : ''}
        text={t.deleteText}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        closeLabel={t.close}
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );

  return { open, sheets };
}
