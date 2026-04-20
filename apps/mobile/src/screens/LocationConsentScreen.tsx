/**
 * Location consent gate: explicit consent before enabling navigation or zone alerts.
 * Block location if not granted; show OS settings deep link if OS permission denied.
 * Requirements: 9.4
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setLocationConsent } from '../storage/mmkv';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LocationConsent'>;
};

export default function LocationConsentScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAllow() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setLocationConsent(true);
        navigation.replace('TicketLink');
      } else {
        // OS permission denied — show settings deep link
        Alert.alert(
          'Location permission required',
          'VenueFlow needs location access for indoor navigation and zone alerts. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => handleDecline() },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDecline() {
    setLocationConsent(false);
    navigation.replace('TicketLink');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📍</Text>
        </View>

        <Text style={styles.title}>Enable location</Text>

        <Text style={styles.body}>
          VenueFlow uses your location to provide turn-by-turn indoor navigation, zone-based
          crowd alerts, and emergency evacuation routes.
        </Text>

        <Text style={styles.body}>
          Your location is anonymized and never stored after your session ends. You can
          withdraw consent at any time in Settings.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleAllow}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Allow location access"
          >
            <Text style={styles.primaryButtonText}>Allow location access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDecline}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Navigation and zone alerts will be unavailable without location access.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 64 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    color: '#a0a0b0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: { marginTop: 32, gap: 12 },
  primaryButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#a0a0b0', fontSize: 15 },
  note: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
