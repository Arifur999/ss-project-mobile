import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { SUPPORT_COPY } from '@/features/support/copy';
import { TICKET_LOOK } from '@/features/support/status';
import { dateLabel, timeLabel } from '@/lib/dates';
import type { SupportTicket } from '@/services/support.services';

/** "07 Oct 2026, 9:30 AM" for a ticket's timestamps, in the phone's own time. */
export function stampLabel(iso: string, lang: 'en' | 'bn') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${dateLabel(day, lang)}, ${timeLabel(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, lang)}`;
}

/** A ticket in the list: its subject, where it stands, who spoke last and what they said, and when. */
export function TicketCard({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const t = useCopy(SUPPORT_COPY);
  const { lang } = useLang();
  const last = ticket.messages[ticket.messages.length - 1];
  const look = TICKET_LOOK[ticket.status];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Txt style={styles.subject} numberOfLines={1}>
          {ticket.subject || t.noSubject}
        </Txt>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Txt style={[styles.badgeText, { color: look.ink }]}>{t.statuses[ticket.status]}</Txt>
        </View>
      </View>
      {last ? (
        <Txt style={styles.preview} numberOfLines={2}>{`${last.from_admin ? t.support : t.you}: ${last.body}`}</Txt>
      ) : null}
      <Txt style={styles.time}>{stampLabel(ticket.last_message_at, lang)}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Zinc[200], backgroundColor: White },
  pressed: { backgroundColor: Zinc[50] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subject: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: Zinc[900] },
  badge: { flexShrink: 0, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  preview: { fontSize: 13, color: Zinc[600] },
  time: { fontSize: 12, color: Zinc[500] },
});
