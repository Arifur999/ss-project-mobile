import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { SUPPORT_COPY } from '@/features/support/copy';
import { errorMessage } from '@/lib/httpClient';
import { createTicket, useTicketWrite, type SupportTicket } from '@/services/support.services';

// The server's own limits, so a long paste fails here rather than after sending.
const SUBJECT_MAX = 120;
const BODY_MAX = 4000;

/** Opening a support ticket - the website's New ticket form: an optional subject and the question. */
export function NewTicketSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (ticket: SupportTicket) => void }) {
  const t = useCopy(SUPPORT_COPY);
  const toast = useToast();
  const put = useTicketWrite();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSubject('');
      setMessage('');
      setSubmitted(false);
      setError(null);
    }
  }

  const invalid = !message.trim();

  const submit = async () => {
    if (sending) return;
    setSubmitted(true);
    if (invalid) return;
    setSending(true);
    setError(null);
    try {
      const ticket = await createTicket({ subject: subject.trim() || undefined, message: message.trim() });
      put(ticket);
      toast.show(t.submitted);
      onClose();
      onCreated(ticket);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !sending && onClose()} closeLabel={t.close}>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.newTicket}
      </Txt>
      <TextField tone="zinc" label={t.subject} placeholder={t.subjectPlaceholder} value={subject} onChangeText={setSubject} maxLength={SUBJECT_MAX} />
      <TextField
        tone="zinc"
        label={t.message}
        placeholder={t.messagePlaceholder}
        value={message}
        onChangeText={setMessage}
        error={submitted && invalid ? t.errMessage : undefined}
        plainError
        multiline
        minHeight={120}
        maxLength={BODY_MAX}
      />
      <AlertBanner tone="error">{error}</AlertBanner>
      <View style={styles.actions}>
        <Button title={sending ? t.sending : t.submit} variant="pill" onPress={submit} busy={sending} style={styles.grow} />
        <Button title={t.cancel} variant="pillOutline" onPress={onClose} disabled={sending} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  grow: { flex: 1, minWidth: 0 },
});
