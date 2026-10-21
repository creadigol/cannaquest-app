import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { brandLabel, colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { ActiveOrder } from '../api/dashboard.types';

type Props = {
  order: ActiveOrder;
};

export function ActiveOrderTracker({ order }: Props) {
  const steps = order.progressSteps || [];
  const statusLabel = order.statusConfig?.label || order.status || 'Active';
  const statusColor = order.statusConfig?.color || 'blue';

  return (
    <Pressable
      onPress={() => router.push('/(app)/(tabs)/orders')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={[brandLabel, styles.headerLabel]}>Active Order</Text>
          <Text style={styles.orderId}>{order.uuid}</Text>
          <Text style={styles.metaText}>
            {order.itemsCount != null ? `${order.itemsCount} item${order.itemsCount !== 1 ? 's' : ''}` : 'Order items'}
            {order.totalAmount != null && order.totalAmount > 0 ? ` · $${Number(order.totalAmount).toFixed(2)}` : ''}
          </Text>
        </View>

        {/* Status Pill matching web dashboard */}
        <View
          style={[
            styles.statusPill,
            statusColor === 'emerald' && styles.statusPillEmerald,
            statusColor === 'amber' && styles.statusPillAmber,
            statusColor === 'blue' && styles.statusPillBlue,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              statusColor === 'emerald' && styles.statusPillTextEmerald,
              statusColor === 'amber' && styles.statusPillTextAmber,
              statusColor === 'blue' && styles.statusPillTextBlue,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {order.shippingSummary ? (
        <Text style={styles.shipping}>{order.shippingSummary}</Text>
      ) : null}

      {/* Progress tracker */}
      {steps.length > 0 ? (
        <View style={styles.stepsRow}>
          {steps.map((step: ActiveOrder['progressSteps'][number], index: number) => {
            const isLast = index === steps.length - 1;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';

            return (
              <View key={step.name || index} style={styles.stepWrap}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.dot,
                      isCompleted && styles.dotCompleted,
                      isCurrent && styles.dotCurrent,
                    ]}
                  />
                  {!isLast ? (
                    <View
                      style={[
                        styles.connector,
                        (isCompleted || isCurrent) && styles.connectorCompleted,
                      ]}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {step.name}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCardBg,
    borderColor: colors.surfaceCardBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.tier2,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerLabel: {
    marginBottom: 2,
  },
  orderId: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  statusPillEmerald: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusPillAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextBlue: {
    color: '#2563eb',
  },
  statusPillTextEmerald: {
    color: colors.emeraldChipText,
  },
  statusPillTextAmber: {
    color: '#d97706',
  },
  shipping: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stepWrap: {
    flex: 1,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dot: {
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  dotCompleted: {
    backgroundColor: colors.primaryGreen,
  },
  dotCurrent: {
    backgroundColor: colors.accentLime,
    borderWidth: 2,
    borderColor: colors.primaryGreen,
  },
  connector: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    flex: 1,
    height: 1.5,
  },
  connectorCompleted: {
    backgroundColor: 'rgba(25, 66, 32, 0.4)',
  },
  stepLabel: {
    color: colors.mutedForeground,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 6,
  },
  stepLabelCompleted: {
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: colors.foreground,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
