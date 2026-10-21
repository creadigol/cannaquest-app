import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';

const SLIDES = [
  {
    label: 'YOUR PRESCRIPTIONS',
    headline: 'All your prescriptions in one place',
    sub: 'Track scripts that are waiting for approval, approved, or already on order.',
    image: require('../../../../assets/images/patient/banner/rx-1.webp'),
  },
  {
    label: 'REPEATS & REFILLS',
    headline: 'Know when your next refill is due',
    sub: 'See how many repeats you have left and when each one becomes available.',
    image: require('../../../../assets/images/patient/banner/rx-2.webp'),
  },
  {
    label: 'QUICK ORDERING',
    headline: 'Order a refill in just a few taps',
    sub: 'Once a refill becomes available, you can add it straight to your cart.',
    image: require('../../../../assets/images/patient/banner/rx-3.webp'),
  },
  {
    label: 'DELIVERY & PICKUP',
    headline: 'Delivered to your door or ready for pickup',
    sub: 'Choose home delivery or collect your order from a participating location.',
    image: require('../../../../assets/images/patient/banner/rx-4.webp'),
  },
];

type Props = {
  onUploadPress?: () => void;
};

export function PrescriptionsHeaderBanner({ onUploadPress }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[activeIdx];

  return (
    <View style={styles.bannerContainer}>
      <ImageBackground
        imageStyle={styles.bannerImage}
        resizeMode="cover"
        source={slide.image}
        style={styles.bannerImageBg}
      >
        <View style={styles.overlay}>
          {/* Top row with Upload button */}
          <View style={styles.topRow}>
            <Text style={styles.badge}>{slide.label}</Text>
            {onUploadPress ? (
              <Pressable
                onPress={onUploadPress}
                style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]}
              >
                <Text style={styles.uploadIcon}>📤</Text>
                <Text style={styles.uploadBtnText}>Upload Script</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Headline & sub */}
          <View style={styles.content}>
            <Text numberOfLines={2} style={styles.title}>
              {slide.headline}
            </Text>
            <Text numberOfLines={2} style={styles.subtitle}>
              {slide.sub}
            </Text>
          </View>

          {/* Dot indicators */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setActiveIdx(i)}
                style={[
                  styles.dot,
                  i === activeIdx ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: radii.xl,
    elevation: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  bannerImageBg: {
    height: 185,
    width: '100%',
  },
  bannerImage: {
    borderRadius: radii.xl,
  },
  overlay: {
    backgroundColor: 'rgba(10, 40, 15, 0.74)',
    borderRadius: radii.xl,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    color: 'rgba(210, 255, 160, 0.95)',
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  uploadBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  uploadIcon: {
    fontSize: 11,
  },
  uploadBtnText: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  title: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  dotsRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  dot: {
    borderRadius: 3,
    height: 5,
  },
  dotActive: {
    backgroundColor: 'rgba(210, 255, 160, 0.95)',
    width: 16,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    width: 5,
  },
});
