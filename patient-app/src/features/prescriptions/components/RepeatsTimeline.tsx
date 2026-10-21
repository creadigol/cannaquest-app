import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '@/lib/theme/tokens';

type Props = {
  repeatTimes: number;
  repeatsFilled: number;
  remainingRepeats: number;
  intervalDays?: number | null;
  createdAt?: string | null;
};

export function RepeatsTimeline({
  repeatTimes,
  repeatsFilled,
  remainingRepeats,
  intervalDays,
  createdAt,
}: Props) {
  if (repeatTimes <= 0) return null;

  const total = repeatTimes;
  const remaining = Math.max(0, remainingRepeats);
  const redeemed = Math.max(0, total - remaining);
  const ratio = total > 0 ? remaining / total : 0;

  const maxNodes = 10;
  const displayTotal = Math.min(total, maxNodes);
  const isCollapsed = total > maxNodes;
  const displayRedeemed = isCollapsed
    ? Math.round((redeemed / total) * displayTotal)
    : redeemed;

  const labelText =
    remaining === 0
      ? 'All repeats used'
      : redeemed === 0
        ? `${remaining} repeats available`
        : `${redeemed} redeemed · ${remaining} remaining`;

  const countColor =
    remaining === 0
      ? colors.mutedForeground
      : ratio <= 0.25
        ? '#ef4444'
        : ratio <= 0.5
          ? '#f59e0b'
          : colors.emeraldChipText;

  const fillPct =
    displayTotal <= 1
      ? displayRedeemed > 0
        ? 100
        : 0
      : Math.max(0, ((displayRedeemed - 1) / (displayTotal - 1)) * 100);

  // Compute node dates if interval & createdAt available
  const nodeDates: string[] = [];
  if (intervalDays && intervalDays > 0 && createdAt) {
    const baseDate = new Date(createdAt);
    if (!isNaN(baseDate.getTime())) {
      for (let j = 0; j < displayTotal; j++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + j * intervalDays);
        nodeDates.push(
          d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
        );
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.labelTitle}>REPEATS</Text>
        <Text style={[styles.labelCount, { color: countColor }]}>{labelText}</Text>
      </View>

      {/* Progress Track and Nodes */}
      <View style={styles.trackContainer}>
        {/* Background line */}
        {displayTotal > 1 ? (
          <View style={styles.trackLine}>
            {displayRedeemed > 0 ? (
              <View
                style={[
                  styles.trackFill,
                  { width: `${fillPct}%` },
                ]}
              />
            ) : null}
          </View>
        ) : null}

        {/* Node Dots */}
        <View style={styles.nodesRow}>
          {Array.from({ length: displayTotal }).map((_, i) => {
            const isRedeemed = i < displayRedeemed;
            const isCurrent =
              i === displayRedeemed - 1 && remaining > 0 && redeemed > 0;
            const isNextAvailable = i === displayRedeemed && remaining > 0;

            return (
              <View key={i} style={styles.nodeItem}>
                <View style={styles.dotWrapper}>
                  {isCurrent ? <View style={styles.currentPulseRing} /> : null}
                  <View
                    style={[
                      styles.dot,
                      isRedeemed ? styles.dotRedeemed : styles.dotPending,
                      isNextAvailable ? styles.dotNext : null,
                    ]}
                  />
                </View>

                {nodeDates[i] ? (
                  <Text
                    style={[
                      styles.dateText,
                      isNextAvailable ? styles.dateTextActive : null,
                    ]}
                  >
                    {nodeDates[i]}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {isCollapsed ? (
        <Text style={styles.collapsedNote}>{total} total repeats</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelTitle: {
    color: colors.gray500,
    fontFamily: typography.bold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  labelCount: {
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  trackContainer: {
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  trackLine: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    height: 2,
    left: 6,
    position: 'absolute',
    right: 6,
    top: 5,
  },
  trackFill: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 2,
    height: '100%',
  },
  nodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  nodeItem: {
    alignItems: 'center',
    minWidth: 16,
  },
  dotWrapper: {
    alignItems: 'center',
    height: 12,
    justifyContent: 'center',
    position: 'relative',
    width: 12,
  },
  currentPulseRing: {
    borderColor: colors.accentLime,
    borderRadius: 10,
    borderWidth: 1.5,
    bottom: -3,
    left: -3,
    position: 'absolute',
    right: -3,
    top: -3,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dotRedeemed: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
    borderWidth: 2,
  },
  dotPending: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 2,
  },
  dotNext: {
    borderColor: colors.accentLime,
    borderWidth: 2.5,
  },
  dateText: {
    color: colors.gray400,
    fontFamily: typography.medium,
    fontSize: 8,
    marginTop: 4,
  },
  dateTextActive: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontWeight: '700',
  },
  collapsedNote: {
    color: colors.gray500,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
});
