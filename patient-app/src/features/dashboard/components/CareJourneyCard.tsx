import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brandLabel, colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { CareJourney } from '../api/dashboard.types';

type Props = {
  journey: CareJourney;
  onStepPress: (ctaRoute: string) => void;
};

export function CareJourneyCard({ journey, onStepPress }: Props) {
  const completedCount = journey.steps.filter((step) => step.completed).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={brandLabel}>Your Care Journey</Text>
          {journey.currentStep ? <Text style={styles.stepOf}>{journey.currentStep.title}</Text> : null}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {completedCount}/{journey.steps.length} Complete
          </Text>
        </View>
      </View>

      <View style={styles.stepsRow}>
        <View style={styles.dashedLine} />
        {journey.steps.map((step) => {
          const isCurrent = step.key === journey.currentStep?.key;
          return (
            <View key={step.key} style={styles.stepItem}>
              <View style={[styles.node, step.completed && styles.nodeCompleted, isCurrent && !step.completed && styles.nodeCurrent]}>
                <Text style={[styles.nodeText, step.completed && styles.nodeTextCompleted, isCurrent && !step.completed && styles.nodeTextCurrent]}>
                  {step.completed ? '✓' : step.number}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.nodeLabel, step.completed && styles.nodeLabelCompleted, isCurrent && !step.completed && styles.nodeLabelCurrent]}
              >
                {step.shortTitle}
              </Text>
            </View>
          );
        })}
      </View>

      {journey.currentStep ? (
        <View style={styles.bookingCard}>
          <View style={styles.bookingTextWrap}>
            <Text style={styles.bookingTitle}>{journey.currentStep.title}</Text>
            <Text style={styles.bookingSubtitle}>{journey.currentStep.description}</Text>
          </View>
          <Pressable
            onPress={() => onStepPress(journey.currentStep!.ctaRoute)}
            style={({ pressed }) => [styles.bookingButton, pressed && styles.pressed]}
          >
            <Text style={styles.bookingButtonText}>{journey.currentStep.ctaLabel} ›</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCardBg,
    borderColor: colors.surfaceCardBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.tier1,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  stepOf: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  badge: {
    backgroundColor: colors.emeraldChipBg,
    borderColor: colors.emeraldChipBorder,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.emeraldChipText, fontSize: 10, fontWeight: '700' },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, position: 'relative' },
  dashedLine: {
    borderColor: colors.dashedStepLine,
    borderStyle: 'dashed',
    borderTopWidth: 2,
    left: '12.5%',
    position: 'absolute',
    right: '12.5%',
    top: 24,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  node: { alignItems: 'center', backgroundColor: colors.muted, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  nodeCompleted: { backgroundColor: colors.accentLime },
  nodeCurrent: { backgroundColor: colors.primaryGreen },
  nodeText: { color: '#9ca3af', fontSize: 13, fontWeight: '700' },
  nodeTextCompleted: { color: colors.primaryGreen },
  nodeTextCurrent: { color: colors.white },
  nodeLabel: { color: '#9ca3af', fontSize: 9, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  nodeLabelCompleted: { color: colors.emeraldChipText },
  nodeLabelCurrent: { color: colors.foreground, fontWeight: '700' },
  bookingCard: {
    alignItems: 'center',
    backgroundColor: colors.journeyBookingCardBg,
    borderColor: colors.journeyBookingCardBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: 14,
  },
  bookingTextWrap: { flex: 1, minWidth: 0 },
  bookingTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  bookingSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  bookingButton: { backgroundColor: colors.limeGradientStart, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 9 },
  bookingButtonText: { color: colors.primaryGreen, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});