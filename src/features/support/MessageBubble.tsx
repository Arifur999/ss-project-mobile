import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy, useLang } from '@/context/LanguageContext';
import { SUPPORT_COPY } from '@/features/support/copy';
import { stampLabel } from '@/features/support/TicketCard';
import type { TicketMessage } from '@/services/support.services';

/** One message in a ticket: the customer's on the right in black, support's on the left in grey, with who and when. */
export function MessageBubble({ message }: { message: TicketMessage }) {
  const t = useCopy(SUPPORT_COPY);
  const { lang } = useLang();
  const mine = !message.from_admin;
  return (
    <View style={[styles.wrap, mine ? styles.mineWrap : styles.theirsWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Txt style={[styles.body, mine && styles.mineText]}>{message.body}</Txt>
      </View>
      <Txt style={[styles.meta, mine && styles.metaMine]}>{`${mine ? t.you : message.author_name || t.support} · ${stampLabel(message.created_at, lang)}`}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '84%', gap: 3 },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  mine: { backgroundColor: Zinc[900], borderBottomRightRadius: 6 },
  theirs: { backgroundColor: Zinc[100], borderBottomLeftRadius: 6 },
  body: { fontSize: 15, lineHeight: 21, color: Zinc[900] },
  mineText: { color: White },
  meta: { fontSize: 11, color: Zinc[500] },
  metaMine: { textAlign: 'right' },
});
