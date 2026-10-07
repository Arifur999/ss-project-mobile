import { useState } from 'react';

import { ConfirmSheet } from '@/components/ItemSheets';
import { useCopy, useLang } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { CUSTOMER_COPY } from '@/features/customers/copy';
import type { CustomerDashboardRow } from '@/lib/customerDue';
import { formatNumber } from '@/lib/money';
import { phoneDigits } from '@/lib/phone';
import { buildDueSms, segmentsFor, smsBusiness } from '@/lib/smsTexts';
import { useBusinessSettings } from '@/services/business.services';
import { sendSms, smsFailureReason } from '@/services/sms.services';

/**
 * The website dashboard's due reminder for one customer: the Bangla text
 * naming what they owe, shown in full with the number it goes to and what it
 * costs before anything is sent from the owner's credits.
 */
export function DueReminderSheet({ customer, onClose }: { customer: CustomerDashboardRow | null; onClose: () => void }) {
  const t = useCopy(CUSTOMER_COPY);
  const { lang } = useLang();
  const toast = useToast();
  const business = useBusinessSettings();
  const [sending, setSending] = useState(false);

  const phone = phoneDigits(customer?.phone || '');
  const message = customer
    ? buildDueSms({ ...smsBusiness(business.data), customerName: customer.name || 'গ্রাহক', due: Number(customer.currentDue || 0) })
    : '';

  const send = async () => {
    if (!customer || sending) return;
    setSending(true);
    try {
      await sendSms([phone], message);
      toast.show(t.reminderSent);
      onClose();
    } catch (e) {
      toast.show(t.smsNotSent(smsFailureReason(e)));
    } finally {
      setSending(false);
    }
  };

  return (
    <ConfirmSheet
      open={!!customer}
      onClose={onClose}
      title={t.reminderTitle}
      text={`${t.reminderText(phone, formatNumber(segmentsFor(message), lang))}\n\n${message}`}
      cancelLabel={t.cancel}
      confirmLabel={t.reminderConfirm}
      closeLabel={t.close}
      busy={sending}
      icon="message"
      tone="primary"
      onConfirm={send}
    />
  );
}
