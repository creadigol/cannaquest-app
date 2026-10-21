import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { NextConsultation } from '../api/dashboard.types';

type Props = {
  consultation: NextConsultation;
  onViewDetails: () => void;
};

export function AppointmentReminderBanner({ consultation, onViewDetails }: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>📅</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.eyebrow}>{consultation.timeUntil || "Tomorrow's appointment"}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {consultation.prescriberName}
        </Text>
        <Text style={styles.datetime}>
          {consultation.bookDate} • {consultation.startTime}
        </Text>
      </View>
      <Pressable onPress={onViewDetails} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>View details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.appointmentReminderEnd,
    borderColor: colors.appointmentReminderBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.tier2,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  icon: { fontSize: 18 },
  textWrap: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accentLime, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { color: colors.white, fontSize: 14, fontWeight: '700', marginTop: 4 },
  datetime: { color: colors.accentLime, fontSize: 11, fontWeight: '600', marginTop: 2 },
  button: { backgroundColor: colors.limeGradientStart, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 9 },
  buttonText: { color: colors.primaryGreen, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
