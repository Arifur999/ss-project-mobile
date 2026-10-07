import { useCallback } from 'react';

import { useCopy } from '@/context/LanguageContext';
import { pickImage } from '@/lib/pickImage';
import type { LocalImage } from '@/services/upload.services';

const COPY = {
  en: {
    denied: 'Allow photo access to choose a picture.',
    tooLarge: 'That photo is over 5 MB. Choose a smaller one.',
    unsupported: 'Choose a JPG, PNG, WebP or GIF photo.',
  },
  bn: {
    denied: 'ছবি বাছাই করতে ছবির অনুমতি দিন।',
    tooLarge: 'ছবিটা ৫ MB-র বেশি। ছোট একটা ছবি বাছুন।',
    unsupported: 'JPG, PNG, WebP বা GIF ছবি বাছুন।',
  },
};

export type PickOutcome = { image: LocalImage } | { error: string } | null;

/**
 * pickImage with the reason worded for the user: the photo, a message saying
 * why there is none, or null when they simply backed out.
 */
export function usePickImage(options: { square?: boolean; fallbackName?: string } = {}) {
  const t = useCopy(COPY);
  const { square, fallbackName } = options;
  return useCallback(async (): Promise<PickOutcome> => {
    const result = await pickImage({ square, fallbackName });
    switch (result.status) {
      case 'picked':
        return { image: result.image };
      case 'cancelled':
        return null;
      default:
        return { error: t[result.status] };
    }
  }, [t, square, fallbackName]);
}
