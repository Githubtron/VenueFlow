/**
 * Offline banner shown when device has no connectivity.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  addConnectivityListener,
  getCurrentConnectivityStatus,
} from '../sync/connectivityManager';

export function OfflineBanner() {
  const [visible, setVisible] = useState(
    getCurrentConnectivityStatus() === 'offline'
  );
  const opacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    const remove = addConnectivityListener((status) => {
      const isOffline = status === 'offline';
      setVisible(isOffline);
      Animated.timing(opacity, {
        toValue: isOffline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return remove;
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <Text style={styles.text}>📡 You're offline — some features may be limited</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
  },
});
