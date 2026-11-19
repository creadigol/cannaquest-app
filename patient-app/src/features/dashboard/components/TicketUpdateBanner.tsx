import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadows, spacing } from '@/lib/theme/tokens';
import type { Ticket } from '@/features/support/api/support.types';

interface Props {
  unreadCount: number;
  ticket?: Ticket | null;
  onPress?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function TicketUpdateBanner({ unreadCount, ticket, onPress }: Props) {
  // Bell chime rotation animation
  const bellAnim = useRef(new Animated.Value(0)).current;

  // Pulse sonar ripple animation behind the bell
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Shimmer reflection beam sweeping across the card
  const shimmerAnim = useRef(new Animated.Value(-150)).current;

  // Scale spring feedback on card press
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Sonar pulse ripple loop
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    pulseLoop.start();

    // 2. Bell chime swing sequence (swing -> wobble -> settle -> pause)
    const bellLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bellAnim, { toValue: -16, duration: 80, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 16, duration: 100, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: -10, duration: 90, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 10, duration: 90, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: -4, duration: 70, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
        Animated.delay(2800),
      ])
    );
    bellLoop.start();

    // 3. Shimmer reflection light streak loop
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: SCREEN_WIDTH + 100,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.delay(3500),
      ])
    );
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      bellLoop.stop();
      shimmerLoop.stop();
    };
  }, [bellAnim, pulseAnim, shimmerAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/(app)/support',
        params: ticket?.id ? { ticketId: ticket.id } : {},
      } as any);
    }
  };

  const bellRotation = bellAnim.interpolate({
    inputRange: [-20, 20],
    outputRange: ['-20deg', '20deg'],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.1],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.75, 0.4, 0],
  });

  const referenceText = ticket?.reference || 'Support Ticket';
  const subjectText = ticket?.subject || 'Support team has updated your ticket';

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.card}
      >
        {/* Shimmer Light Beam Reflection */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerBeam,
            {
              transform: [{ translateX: shimmerAnim }],
            },
          ]}
        />

        {/* Left Column: Animated Bell with Sonar Ripple */}
        <View style={styles.iconColumn}>
          <View style={styles.bellContainer}>
            {/* Sonar Ripple Rings */}
            <Animated.View
              style={[
                styles.sonarRing,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.sonarRingInner,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            {/* Glowing Bell Icon */}
            <View style={styles.bellCircle}>
              <Animated.Text
                style={[
                  styles.bellIcon,
                  {
                    transform: [{ rotate: bellRotation }],
                  },
                ]}
              >
                🔔
              </Animated.Text>
            </View>
          </View>
        </View>

        {/* Center Column: Sassy Ticket Update Content */}
        <View style={styles.contentColumn}>
          <View style={styles.headerRow}>
            <View style={styles.badgePill}>
              <View style={styles.livePulseDot} />
              <Text style={styles.badgeText}>
                {unreadCount > 1 ? `${unreadCount} NEW UPDATES` : 'NEW REPLY'}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.refTag}>
              {referenceText}
            </Text>
          </View>

          <Text numberOfLines={1} style={styles.title}>
            {subjectText}
          </Text>

          <Text numberOfLines={2} style={styles.subtitle}>
            Support staff replied to your request. Tap to view the response & full timeline.
          </Text>
        </View>

        {/* Right Column: Sleek CTA Pill */}
        <View style={styles.actionColumn}>
          <View style={styles.ctaPill}>
            <Text style={styles.ctaText}>View</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.xl,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    ...shadows.tier2,
  },
  card: {
    backgroundColor: '#042f2e', // Deep emerald obsidian
    borderColor: 'rgba(52, 211, 153, 0.45)', // Luminous mint border
    borderRadius: radii.xl,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerBeam: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ skewX: '-25deg' }],
    zIndex: 1,
  },
  iconColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  bellContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    width: 46,
    position: 'relative',
  },
  sonarRing: {
    position: 'absolute',
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.7)',
  },
  sonarRingInner: {
    position: 'absolute',
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(5, 150, 105, 0.3)',
  },
  bellCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#064e3b',
    borderWidth: 1.5,
    borderColor: '#34d399',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  bellIcon: {
    fontSize: 20,
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 2,
    paddingRight: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  badgeText: {
    color: '#34d399',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refTag: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(209, 250, 229, 0.85)',
    fontSize: 11,
    lineHeight: 15,
  },
  actionColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  ctaText: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: '800',
  },
  ctaArrow: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
});
