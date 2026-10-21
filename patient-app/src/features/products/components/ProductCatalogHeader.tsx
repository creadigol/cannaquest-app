import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme/tokens';

const SLIDES = [
  {
    label: 'YOUR PRODUCTS',
    headline: 'Browse your prescribed products',
    sub: 'All the products that make up your treatment plan, gathered in one place.',
    image: require('../../../../assets/images/patient/banner/banner-1.webp'),
  },
  {
    label: 'PRODUCT DETAILS',
    headline: 'Full details on every product',
    sub: 'See the full information for each product before you place an order.',
    image: require('../../../../assets/images/patient/banner/banner-2.webp'),
  },
  {
    label: 'BROWSE BY CATEGORY',
    headline: 'Find products by category',
    sub: 'Filter by category to quickly narrow down the products you are looking for.',
    image: require('../../../../assets/images/patient/banner/banner-3.webp'),
  },
  {
    label: 'SIMPLE REORDERS',
    headline: 'Reorder your products whenever you need them',
    sub: 'Add prescribed items straight to your cart and check out in a few taps.',
    image: require('../../../../assets/images/patient/banner/banner-4.webp'),
  },
];

export function ProductCatalogHeader() {
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
          <View style={styles.content}>
            <Text style={styles.badge}>{slide.label}</Text>
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
    marginBottom: spacing.xs,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  bannerImageBg: {
    height: 175,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  badge: {
    color: 'rgba(210, 255, 160, 0.95)',
    fontFamily: typography.bold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
    textTransform: 'uppercase',
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

