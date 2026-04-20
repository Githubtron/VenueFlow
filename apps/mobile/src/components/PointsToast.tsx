/**
 * Points toast notification: shows awarded points with message.
 * Used for: gate entry (+50), off-peak kiosk (+30), incident report (+40), pre-event sync (+20), accessible route (+25).
 * Requirements: 22.1, 22.2
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';

interface Props {
  points: number;
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function PointsToast({ points, message, onDismiss, duration = 3000 }: Props) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }], opacity }]}>
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>+{points}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 80,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pointsBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  message: { color: '#fff', fontSize: 13, flex: 1 },
});
