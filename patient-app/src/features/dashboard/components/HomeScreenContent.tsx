import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCurrentCustomer } from '@/features/customer/hooks/useCurrentCustomer';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import { useCareJourney } from '../hooks/useCareJourney';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { CareJourneyCard } from './CareJourneyCard';
import { HeroCard } from './HeroCard';
import { TicketUpdateBanner } from './TicketUpdateBanner';
import { NextConsultationCard } from './NextConsultationCard';
import { ActiveOrderTracker } from './ActiveOrderTracker';
import { OrderableScriptsList } from './OrderableScriptsList';
import { QuickAccessGrid } from './QuickAccessGrid';
import { RecentOrdersList } from './RecentOrdersList';
import { ConsumptionCalendarModal } from './ConsumptionCalendarModal';
import { addToCart, useCart } from '@/features/cart';
import { useSupportSummary } from '@/features/support/hooks/useSupport';

function goToTab(path: string) {
  router.push(path as Href);
}

/**
 * Maps a care-journey step's ctaRoute (e.g. "/prescriptions",
 * "/consultations?book=1") to our own tab routes. The web app's routes
 * don't match our Expo Router paths 1:1, so this translates the ones we
 * know about and falls back to Home for anything unrecognised.
 */
function resolveCtaRoute(ctaRoute: string): string {
  if (ctaRoute.startsWith('/questionnaire')) return '/(app)/questionnaire';
  if (ctaRoute.startsWith('/consultations')) return '/(app)/(tabs)/consults';
  if (ctaRoute.startsWith('/prescriptions')) return '/(app)/(tabs)/scripts';
  return '/(app)/(tabs)';
}

export function HomeScreenContent() {
  const { refreshCart } = useCart();
  const summary = useDashboardSummary();
  const careJourney = useCareJourney();
  const customer = useCurrentCustomer();
  const supportSummary = useSupportSummary();
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Customer load failure doesn't block the rest of Home — it only loses
  // the personalised greeting, which HeroCard already falls back for.
  const isLoading = summary.isLoading || careJourney.isLoading;
  const isError = summary.isError || careJourney.isError;
  const isRefreshing = summary.isRefetching || careJourney.isRefetching || customer.isRefetching;

  const onRefresh = () => {
    void summary.refetch();
    void careJourney.refetch();
    void customer.refetch();
    void supportSummary.refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primaryGreen} size="large" />
      </View>
    );
  }

  if (isError || !summary.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>We couldn&apos;t load your dashboard. Pull down to try again.</Text>
      </View>
    );
  }

  const data = summary.data;
  const journey = careJourney.data;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={isRefreshing} tintColor={colors.primaryGreen} />}
      showsVerticalScrollIndicator={false}
    >
      <HeroCard
        firstName={customer.data?.firstName}
        journey={journey}
        questionnaireCompleted={data.questionnaireCompleted}
        activePrescriptionsCount={data.activePrescriptionsCount}
        unreadCount={supportSummary.data?.unreadCount || 0}
        onNotificationPress={() => {
          const firstUnread =
            supportSummary.data?.items?.find((t) => t.unread) ||
            supportSummary.data?.items?.[0];
          router.push({
            pathname: '/(app)/support',
            params: firstUnread ? { ticketId: firstUnread.id } : {},
          } as any);
        }}
        onCompleteForm={() => {
          if (journey?.currentStep?.ctaRoute) {
            goToTab(resolveCtaRoute(journey.currentStep.ctaRoute));
          } else {
            goToTab('/(app)/questionnaire');
          }
        }}
        onBookConsultation={() => goToTab('/(app)/(tabs)/consults')}
        onViewScripts={() => goToTab('/(app)/(tabs)/scripts')}
      />

      {/* Classy, Sassy, Animated Live Ticket Update Banner on Dashboard */}
      {Boolean(supportSummary.data?.unreadCount && supportSummary.data.unreadCount > 0) && (
        <TicketUpdateBanner
          unreadCount={supportSummary.data?.unreadCount || 0}
          ticket={
            supportSummary.data?.items?.find((t) => t.unread) ||
            supportSummary.data?.items?.[0] ||
            null
          }
          onPress={() => {
            const firstUnread =
              supportSummary.data?.items?.find((t) => t.unread) ||
              supportSummary.data?.items?.[0];
            router.push({
              pathname: '/(app)/support',
              params: firstUnread ? { ticketId: firstUnread.id } : {},
            } as any);
          }}
        />
      )}

      {journey && journey.visible ? <CareJourneyCard journey={journey} onStepPress={(route) => goToTab(resolveCtaRoute(route))} /> : null}

      <QuickAccessGrid
        items={[
          { key: 'scripts', label: 'Scripts', icon: '📄', onPress: () => goToTab('/(app)/(tabs)/scripts') },
          { key: 'consults', label: 'Consults', icon: '🩺', onPress: () => goToTab('/(app)/(tabs)/consults') },
          { key: 'orders', label: 'Orders', icon: '📦', onPress: () => goToTab('/(app)/(tabs)/orders') },
          {
            key: 'support',
            label: 'Support',
            icon: '🎫',
            badge:
              supportSummary.data?.unreadCount && supportSummary.data.unreadCount > 0
                ? supportSummary.data.unreadCount > 9
                  ? '9+'
                  : supportSummary.data.unreadCount
                : undefined,
            onPress: () => router.push('/(app)/support' as any),
          },
        ]}
      />

      {/* Smart Card: Next Consultation (Matching Private_Medi_Platform) */}
      {data.nextConsultation ? (
        <NextConsultationCard
          consultation={data.nextConsultation}
          onJoinCall={() => goToTab('/(app)/(tabs)/consults')}
        />
      ) : null}

      {/* Active Order Tracker (Matching Private_Medi_Platform active orders section) */}
      {data.activeOrder ? (
        <ActiveOrderTracker order={data.activeOrder} />
      ) : null}

      <OrderableScriptsList
        onAddToCart={async (rx) => {
          try {
            await addToCart({
              productId: rx.productId || rx.id,
              prescriptionId: Number(rx.prescriptionId || rx.id),
              source: 'prescription',
            });
            await refreshCart();
            Alert.alert('Added to Cart', 'Prescription medication added to your cart.');
          } catch {
            Alert.alert('Notice', 'Could not add to cart.');
          }
        }}
        onViewAll={() => goToTab('/(app)/(tabs)/scripts')}
        onOpenSchedule={() => setShowCalendarModal(true)}
        scripts={data.orderablePrescriptions}
      />

      <RecentOrdersList activeOrdersCount={data.activeOrdersCount} orders={data.recentOrders} />

      {/* Consumption / Refill Schedule Modal */}
      <ConsumptionCalendarModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  errorText: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center' },
});