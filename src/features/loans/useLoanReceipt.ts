import { useCallback } from 'react';

import { useCan } from '@/hooks/useCan';
import { buildLoanTransactionSms, smsBusiness } from '@/lib/smsTexts';
import { isBdPhone } from '@/lib/validation';
import { useBusinessSettings } from '@/services/business.services';
import type { Lender } from '@/services/loans.services';
import { sendSms } from '@/services/sms.services';

/**
 * Texts a bank / person the receipt of one transaction, worded as the
 * website's: the amount, then the PRINCIPAL afterwards - which a profit row
 * leaves where it was. Resolves false when they have no valid phone number;
 * a gateway failure throws, for the caller to word with smsFailureMessage.
 * Null for a member who may not text, so nothing offers it: every /sms route
 * is the owner's.
 */
export function useLoanReceipt() {
  const business = useBusinessSettings();
  const mayText = useCan()('sms.send');
  const send = useCallback(
    async (lender: Lender | null | undefined, amount: number, principalAfter: number): Promise<boolean> => {
      const phone = String(lender?.phone || '').trim();
      if (!isBdPhone(phone)) return false;
      await sendSms(
        [phone],
        buildLoanTransactionSms({
          ...smsBusiness(business.data),
          customerName: String(lender?.name || '').trim() || 'Client',
          amount,
          principalAfter,
        }),
      );
      return true;
    },
    [business.data],
  );
  return mayText ? send : null;
}
