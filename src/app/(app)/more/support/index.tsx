import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { PromptCard } from '@/components/PromptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Fab } from '@/components/SectionShell';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { SUPPORT_COPY } from '@/features/support/copy';
import { NewTicketSheet } from '@/features/support/NewTicketSheet';
import { TicketCard } from '@/features/support/TicketCard';
import { whatsAppLink } from '@/lib/support';
import { useMyTickets, useSupportNumber } from '@/services/support.services';

/**
 * The customer's side of support - the website's Support Ticket page: every
 * ticket with where it stands, a new one, WhatsApp for anything urgent, and
 * the note that the guideline videos are on their way.
 */
export default function SupportScreen() {
  const t = useCopy(SUPPORT_COPY);
  const supportNumber = useSupportNumber();
  const query = useMyTickets(true);
  const [composing, setComposing] = useState(false);
  const tickets = query.data ?? [];
  const openTicket = (id: string) => router.push({ pathname: '/more/support/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchedAfterMount} onRefresh={() => query.refetch()} tintColor={Zinc[900]} />}>
        <ScreenHeader title={t.title} onBack={() => router.navigate('/more')} backLabel={t.backToMenu} />
        <View style={styles.body}>
          <Txt style={styles.intro}>{t.intro}</Txt>
          <Button title={t.whatsApp} icon="message" variant="pillOutline" onPress={() => Linking.openURL(whatsAppLink(supportNumber)).catch(() => {})} />

          {query.isPending ? (
            <LoadingState minHeight={200} />
          ) : query.isError ? (
            <View style={styles.state}>
              <AlertBanner tone="error">{t.loadError}</AlertBanner>
              <Button title={t.retry} variant="pillOutline" onPress={() => query.refetch()} />
            </View>
          ) : tickets.length === 0 ? (
            <PromptCard icon="headset" text={t.noTickets} />
          ) : (
            tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => openTicket(ticket.id)} />)
          )}

          <View style={styles.videos}>
            <Txt style={styles.videosTitle}>{t.videosTitle}</Txt>
            <Txt style={styles.videosText}>{t.videosText}</Txt>
          </View>
        </View>
      </ScrollView>

      {query.isSuccess ? <Fab label={t.newTicket} onPress={() => setComposing(true)} /> : null}
      <NewTicketSheet open={composing} onClose={() => setComposing(false)} onCreated={(ticket) => openTicket(ticket.id)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  page: { paddingBottom: 96 },
  body: { gap: 14, paddingTop: 6, paddingHorizontal: 20 },
  intro: { fontSize: 14, color: Zinc[600] },
  state: { minHeight: 200, justifyContent: 'center', gap: 12 },
  videos: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: Zinc[100] },
  videosTitle: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  videosText: { fontSize: 13, color: Zinc[600] },
});
