import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ProfileHeaderCardProps {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  title?: string;
  verified?: boolean;
  verificationStatus?: {
    label: string;
    color: string;
    bg: string;
  };
  role?: 'psychologist' | 'patient'; // To determine which icon to show
}

export function ProfileHeaderCard({
  firstName,
  lastName,
  fullName,
  email,
  title,
  verified = false,
  verificationStatus,
  role,
}: ProfileHeaderCardProps) {
  // Animation values
  const heartScale = useRef(new Animated.Value(1)).current;
  const stethoscopeRotate = useRef(new Animated.Value(0)).current;

  // Heart breathing animation (for patient)
  useEffect(() => {
    if (role === 'patient') {
      const breatheAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      breatheAnimation.start();
      return () => breatheAnimation.stop();
    }
  }, [role, heartScale]);

  // Stethoscope swing animation (for psychologist)
  useEffect(() => {
    if (role === 'psychologist') {
      const swingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(stethoscopeRotate, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(stethoscopeRotate, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      swingAnimation.start();
      return () => swingAnimation.stop();
    }
  }, [role, stethoscopeRotate]);

  // Get initials for avatar
  const getInitials = () => {
    if (fullName) {
      const names = fullName.split(' ');
      return (names[0]?.[0] || '') + (names[names.length - 1]?.[0] || '');
    }
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  // Get display name
  const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim();

  // Interpolate rotation for stethoscope
  const rotateInterpolate = stethoscopeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  return (
    <View style={styles.container}>
      {/* Decorative Icon - Bottom Right with Animation */}
      {role === 'psychologist' ? (
        <Animated.View
          style={[
            styles.decorativeIconContainer,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        >
          <Ionicons name="medkit" size={68} color="#6B7280" />
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.decorativeIconContainer,
            { transform: [{ scale: heartScale }] },
          ]}
        >
          {/* Heart with glow/feather effect */}
          <View style={styles.heartContainer}>
            {/* Outer glow layer - largest */}
            <View style={styles.heartGlowOuter}>
              <Ionicons name="heart" size={68} color="#FCA5A5" />
            </View>
            {/* Middle glow layer */}
            <View style={styles.heartGlowMiddle}>
              <Ionicons name="heart" size={68} color="#F87171" />
            </View>
            {/* Inner heart - brightest */}
            <View style={styles.heartGlowInner}>
              <Ionicons name="heart" size={68} color="#EF4444" />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Main Content Row */}
      <View style={styles.contentRow}>
        {/* Left: Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials().toUpperCase()}</Text>
          </View>
          {verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color={colors.white} />
            </View>
          )}
        </View>

        {/* Right: Name, Title, Email */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {displayName || 'Kullanıcı'}
            </Text>
            {verificationStatus && (
              <View style={[styles.statusChip, { backgroundColor: verificationStatus.bg }]}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={verificationStatus.color}
                  style={styles.statusIcon}
                />
                <Text style={[styles.statusText, { color: verificationStatus.color }]}>
                  {verificationStatus.label}
                </Text>
              </View>
            )}
          </View>

          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}

          <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
            {email || ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    paddingTop: 28,
    paddingBottom: 32, // Extra bottom padding for icon
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    minHeight: 170, // Increased height
  },
  decorativeIconContainer: {
    position: 'absolute',
    bottom: 12, // Bottom right positioning
    right: 12,
    opacity: 0.4,
    zIndex: 0,
  },
  heartContainer: {
    position: 'relative',
    width: 68,
    height: 68,
  },
  heartGlowOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.15, // Very subtle outer glow
  },
  heartGlowMiddle: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.3, // Medium glow
  },
  heartGlowInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 1, // Full opacity for the main heart
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    zIndex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginTop: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 18,
  },
  email: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
