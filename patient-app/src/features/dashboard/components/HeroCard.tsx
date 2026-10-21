import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, shadows, spacing } from '@/lib/theme/tokens';

const HERO_BG = require('../../../../assets/images/hero-gradient-bg.png');
const CQ_WATERMARK = require('../../../../assets/images/cq-watermark.png');
const WORDMARK_LOGO = require('../../../../assets/logos/cannaquest-wordmark.png');

import type { CareJourney } from '../api/dashboard.types';

type Props = {
  /**
   * Comes from GET /customers/me, passed down by HomeScreenContent.
   */
  firstName?: string;
  journey?: CareJourney | null;
  questionnaireCompleted?: boolean;
  activePrescriptionsCount?: number;
  onCompleteForm?: () => void;
  onBookConsultation: () => void;
  onViewScripts: () => void;
};

function getGreetingText(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

const CONTEXTUAL_MESSAGES = [
  'How are you feeling today?',
  'Consistency supports healing',
  'Small steps. Real progress.',
];

/**
 * AnimatedGhostText
 * Faithful React Native port of Private_Medi_Platform's Alpine ghostText:
 * - Types in characters with staggered fade-in (delay: stagger(0.028s))
 * - Holds for 6 seconds
 * - Fades out container smoothly over 300ms
 * - Cycles to the next message and re-types
 */
function AnimatedGhostText({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const currentText = messages[index] || '';

  // Array of Animated.Values, one per character
  const charAnims = useMemo(() => {
    return currentText.split('').map(() => new Animated.Value(0));
  }, [currentText]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Reset container opacity to 1
    containerOpacity.setValue(1);

    // Stagger character animations in (0.028s stagger delay matching Motion)
    const animSequence = charAnims.map((anim, idx) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        delay: idx * 28,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animSequence).start(() => {
      // Hold message for 6s just like Private_Medi_Platform
      timer = setTimeout(() => {
        // Fade out entire line (300ms)
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setIndex((prev) => (prev + 1) % messages.length);
        });
      }, 6000);
    });

    return () => {
      clearTimeout(timer);
    };
  }, [index, charAnims, containerOpacity, messages.length]);

  return (
    <Animated.View style={[styles.ghostTextContainer, { opacity: containerOpacity }]}>
      {currentText.split('').map((char, i) => (
        <Animated.Text
          key={`${index}-${i}`}
          style={[
            styles.tickerText,
            {
              opacity: charAnims[i],
              transform: [
                {
                  translateY: charAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {char}
        </Animated.Text>
      ))}
    </Animated.View>
  );
}

export function HeroCard({
  firstName,
  journey,
  questionnaireCompleted,
  activePrescriptionsCount = 0,
  onCompleteForm,
  onBookConsultation,
  onViewScripts,
}: Props) {
  const greeting = useMemo(() => getGreetingText(), []);

  // Determine which step needs action.
  // We check steps in order 1 -> 2 -> 3. The first incomplete step takes precedence.
  // If third is done but first is not, first is prioritized ("Complete Form").
  // If first and third are done but second is left, second is prioritized ("Book Consultation").
  const primaryAction = useMemo(() => {
    // If care-journey steps are available from API
    if (journey && Array.isArray(journey.steps) && journey.steps.length > 0) {
      const step1 = journey.steps.find((s) => s.number === 1 || s.key === 'intake');
      const step2 = journey.steps.find((s) => s.number === 2 || s.key === 'consultation');
      const step3 = journey.steps.find((s) => s.number === 3 || s.key === 'script');

      // 1. Is Step 1 incomplete?
      if (step1 && !step1.completed) {
        return {
          label: 'Complete Form',
          icon: '📋',
          onPress: onCompleteForm || onBookConsultation,
        };
      }

      // 2. Is Step 2 incomplete?
      if (step2 && !step2.completed) {
        return {
          label: 'Book Consultation',
          icon: '📅',
          onPress: onBookConsultation,
        };
      }

      // 3. Is Step 3 incomplete?
      if (step3 && !step3.completed) {
        return {
          label: 'Order Scripts',
          icon: '🌿',
          onPress: onViewScripts,
        };
      }

      // If all 3 steps are complete and user has active prescriptions
      if (activePrescriptionsCount > 0) {
        return {
          label: 'Continue Care',
          icon: '🌿',
          onPress: onViewScripts,
        };
      }

      return {
        label: 'Order Scripts',
        icon: '🌿',
        onPress: onViewScripts,
      };
    }

    // Fallback based on summary flags if care-journey not loaded yet
    if (questionnaireCompleted === false) {
      return {
        label: 'Complete Form',
        icon: '📋',
        onPress: onCompleteForm || onBookConsultation,
      };
    }

    if (activePrescriptionsCount > 0) {
      return {
        label: 'Order Scripts',
        icon: '🌿',
        onPress: onViewScripts,
      };
    }

    return {
      label: 'Book Consultation',
      icon: '📅',
      onPress: onBookConsultation,
    };
  }, [journey, questionnaireCompleted, activePrescriptionsCount, onCompleteForm, onBookConsultation, onViewScripts]);

  return (
    <View style={styles.cardContainer}>
      {/* Dynamic Gradient Background */}
      <ImageBackground source={HERO_BG} resizeMode="cover" style={styles.background}>
        {/* CQ Watermark Monogram placed on the right */}
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <Image source={CQ_WATERMARK} resizeMode="contain" style={styles.watermarkImage} />
        </View>

        {/* CannaQuest Glass Brand Badge on top right */}
        <View style={styles.brandBadge}>
          <Image source={WORDMARK_LOGO} resizeMode="contain" style={styles.brandLogo} />
        </View>

        {/* Content Column */}
        <View style={styles.content}>
          {/* Eyebrow / Greeting */}
          <Text style={styles.eyebrow}>{greeting}</Text>

          {/* User Name Greeting */}
          <Text style={styles.greetingTitle}>
            Hi, {firstName || 'there'} 👋
          </Text>

          {/* Contextual Subline with Emerald Dot and GhostText Stagger Animation */}
          <View style={styles.tickerRow}>
            <View style={styles.emeraldDot} />
            <View style={styles.tickerWrapper}>
              <AnimatedGhostText messages={CONTEXTUAL_MESSAGES} />
            </View>
          </View>

          {/* Action CTAs */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={primaryAction.onPress}
              style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
            >
              <Text style={styles.clipboardIcon}>{primaryAction.icon}</Text>
              <Text style={styles.primaryCtaText}>{primaryAction.label}</Text>
            </Pressable>

            <Pressable
              onPress={onViewScripts}
              style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryCtaText}>View Scripts</Text>
              <Text style={styles.arrowIcon}>→</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: radii.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    ...shadows.tier2,
    marginBottom: spacing.xs,
  },
  background: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    position: 'relative',
    minHeight: 184,
  },
  watermarkWrap: {
    position: 'absolute',
    right: -25,
    top: 5,
    bottom: -15,
    width: '64%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    opacity: 0.11,
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  brandBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 10,
  },
  brandLogo: {
    width: 92,
    height: 18,
  },
  content: {
    zIndex: 5,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.54, // 0.14em of 11px
    color: 'rgba(25, 66, 32, 0.60)', // hsl(140 50% 20% / 0.60)
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0d2d14',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12, // mt-3
    marginBottom: 20, // mt-5 gap before CTAs
    minHeight: 20, // h-5
  },
  emeraldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981', // bg-emerald-500
    shadowColor: 'rgba(52, 211, 153, 0.7)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  tickerWrapper: {
    flex: 1,
    overflow: 'hidden',
    height: 20,
    justifyContent: 'center',
  },
  ghostTextContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  tickerText: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: 'rgba(27, 64, 34, 0.72)', // hsl(140 40% 18% / 0.72)
    letterSpacing: 0,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#bcf27f',
    borderRadius: radii.full,
    paddingHorizontal: 15,
    paddingVertical: 9.5,
    shadowColor: '#0e3017',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  primaryCtaText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0e3017',
  },
  clipboardIcon: {
    fontSize: 12.5,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 9.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  secondaryCtaText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1b3b21',
  },
  arrowIcon: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1b3b21',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});