import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { LoadingState } from '@/components/LoadingState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { SUPPORT_COPY } from '@/features/support/copy';
import { MessageBubble } from '@/features/support/MessageBubble';
import { TICKET_LOOK } from '@/features/support/status';
import { errorMessage } from '@/lib/httpClient';
import { noteTyping, replyToTicket, useMyTickets, useTicketWrite } from '@/services/support.services';

// Keystrokes are told to support at most this often, as the website's heartbeat does.
const TYPING_EVERY_MS = 3000;
const BODY_MAX = 4000;

/** Whether enough time has passed since the last typing heartbeat; marks this one when it has. */
function heartbeatDue(last: { current: number }) {
  const now = Date.now();
  if (now - last.current <= TYPING_EVERY_MS) return false;
  last.current = now;
  return true;
}

/**
 * One support conversation - the website's ticket thread: every message in
 * order, support's typing mark, the solved note, and a reply box. Kept current
 * every few seconds; writing on a solved ticket opens it again.
 */
export default function TicketThreadScreen() {
  const t = useCopy(SUPPORT_COPY);
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMyTickets(true);
  const put = useTicketWrite();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTyping = useRef(0);
  const scroll = useRef<ScrollView>(null);

  const ticket = query.data?.find((x) => x.id === id);
  const look = ticket ? TICKET_LOOK[ticket.status] : null;

  const type = (text: string) => {
    setReply(text);
    if (ticket && text.trim() && heartbeatDue(lastTyping)) noteTyping(ticket.id);
  };

  const send = async () => {
    if (!ticket || sending) return;
    const text = reply.trim();
    if (!text) {
      setError(t.errReply);
      return;
    }
    setSending(true);
    setError(null);
    try {
      put(await replyToTicket(ticket.id, text));
      setReply('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={ticket?.subject || t.noSubject} onBack={() => router.back()} backLabel={t.back} />
      {!ticket ? (
        <View style={styles.state}>
          {query.isPending ? <LoadingState /> : <AlertBanner tone="error">{t.loadError}</AlertBanner>}
        </View>
      ) : (
        <KeyboardScreen style={styles.flex}>
          <ScrollView
            ref={scroll}
            contentContainerStyle={styles.thread}
            // The newest message is the one to see; follow the thread down as it grows.
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            {look ? (
              <View style={[styles.badge, { backgroundColor: look.bg }]}>
                <Txt style={[styles.badgeText, { color: look.ink }]}>{t.statuses[ticket.status]}</Txt>
              </View>
            ) : null}
            {ticket.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {ticket.other_typing ? <Txt style={styles.typing}>{t.typing}</Txt> : null}
            {ticket.status === 'solved' ? <Txt style={styles.solved}>{t.solvedNote}</Txt> : null}
          </ScrollView>
          <View style={styles.composer}>
            <AlertBanner tone="error">{error}</AlertBanner>
            <View style={styles.row}>
              <View style={styles.grow}>
                <TextField
                  tone="zinc"
                  label=""
                  accessibilityLabel={t.replyPlaceholder}
                  placeholder={t.replyPlaceholder}
                  value={reply}
                  onChangeText={type}
                  multiline
                  maxLength={BODY_MAX}
                />
              </View>
              <Button title={sending ? t.sending : t.send} variant="pill" onPress={send} busy={sending} />
            </View>
          </View>
        </KeyboardScreen>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  thread: { gap: 12, padding: 20 },
  badge: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  typing: { fontSize: 13, fontStyle: 'italic', color: Zinc[500] },
  solved: { alignSelf: 'center', textAlign: 'center', fontSize: 13, color: Zinc[600] },
  composer: { gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: Zinc[200], backgroundColor: White },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
});
