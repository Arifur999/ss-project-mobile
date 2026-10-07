// The support line, as Hatim/src/lib/support.ts keeps it: the number people
// read, the international form WhatsApp needs, and the link. A number the
// super admin set in platform settings wins; this one stands in until that
// has loaded, or when it was left blank.

export const SUPPORT_NUMBER = '01719731884';
export const SUPPORT_WHATSAPP_INTL = '8801719731884';

export const supportNumberOrFallback = (configured?: string | null): string => String(configured || '').trim() || SUPPORT_NUMBER;

/** The digits WhatsApp expects: a local leading 0 becomes 880. */
export const toWhatsAppNumber = (value?: string | null): string => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return SUPPORT_WHATSAPP_INTL;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
};

export const whatsAppLink = (value?: string | null, message?: string): string => {
  const text = message ?? 'Hi, I need help with my Furniture Management account.';
  return `https://wa.me/${toWhatsAppNumber(value)}?text=${encodeURIComponent(text)}`;
};
