import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';

import { ConfirmDeleteSheet } from '@/components/ItemSheets';
import { useCopy } from '@/context/LanguageContext';

const COPY = {
  en: {
    title: 'Discard your changes?',
    text: 'What you typed will not be saved.',
    discard: 'Discard',
    keep: 'Keep editing',
    close: 'Close',
  },
  bn: {
    title: 'পরিবর্তনগুলো বাদ দেবেন?',
    text: 'যা লিখেছেন তা সেভ হবে না।',
    discard: 'বাদ দিন',
    keep: 'লিখতে থাকুন',
    close: 'বন্ধ করুন',
  },
};

type LeaveAction = Parameters<Parameters<typeof usePreventRemove>[1]>[0]['data']['action'];

/**
 * For a full-screen form: while `dirty`, leaving - the back arrow, Cancel or
 * the phone's back button - first asks "Discard your changes?". Render
 * `sheet` in the screen; call `finish()` after a save to leave without asking.
 */
export function useLeaveGuard(dirty: boolean) {
  const t = useCopy(COPY);
  const navigation = useNavigation();
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState<LeaveAction | null>(null);

  usePreventRemove(dirty && !finished, ({ data }) => setLeaving(data.action));
  // Leaves once the finished state has rendered, so the guard above has let go.
  useEffect(() => {
    if (finished) router.back();
  }, [finished]);

  const sheet = (
    <ConfirmDeleteSheet
      open={!!leaving}
      onClose={() => setLeaving(null)}
      title={t.title}
      text={t.text}
      cancelLabel={t.keep}
      deleteLabel={t.discard}
      closeLabel={t.close}
      onConfirm={() => {
        const action = leaving;
        setLeaving(null);
        if (action) navigation.dispatch(action);
      }}
    />
  );

  return { finish: () => setFinished(true), sheet };
}
