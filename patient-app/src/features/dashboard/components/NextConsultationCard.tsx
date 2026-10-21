import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { NextConsultation } from '../api/dashboard.types';

type Props = {
  consultation: NextConsultation;
  onJoinCall?: () => void;
};

export function NextConsultationCard({ consultation, onJoinCall }: Props) {
  return (
    <Pressable
      onPress={() => router.push('/(app)/(tabs)/consults')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.eyebrow}>{consultation.timeUntil || 'UPCOMING CONSULTATION'}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {consultation.prescriberName}
          </Text>
          <Text style={styles.datetime}>
            {consultation.formattedDate || `${consultation.bookDate} • ${consultation.startTime}`}
          </Text>
        </View>

        {/* Join Call button temporarily commented out */}
        {/* {consultation.canJoin ? (
          <Pressable
            onPress={onJoinCall}
            style={({ pressed }) => [styles.joinButton, pressed && styles.btnPressed]}
          >
            <View style={styles.joinDot} />
            <Text style={styles.joinText}>Join Call</Text>
          </Pressable>
        ) : ( */}
        <View style={styles.confirmedPill}>
          <Text style={styles.confirmedCheck}>✓</Text>
          <Text style={styles.confirmedText}>Confirmed</Text>
        </View>
        {/* )} */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#194220',
    borderRadius: radii.xl,
    overflow: 'hidden',
    padding: spacing.lg,
    ...shadows.tier3,
  },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  textWrap: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  eyebrow: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 4 },
  datetime: { color: colors.accentLime, fontSize: 12, fontWeight: '600', marginTop: 3 },
  joinButton: {
    alignItems: 'center',
    backgroundColor: colors.heroConfirmedPillBg,
    borderColor: colors.heroConfirmedPillBorder,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  joinDot: { backgroundColor: colors.accentLime, borderRadius: 4, height: 8, width: 8 },
  joinText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  confirmedPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  confirmedCheck: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '700' },
  confirmedText: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
