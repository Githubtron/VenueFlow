/**
 * General SOS screen: POST /emergency/sos; "Help is on the way" + first-aid pin; idempotent.
 * 3-second cancel window after FAB tap.
 * Queue SOS offline in sync queue.
 * Requirements: 5.1, 5.2, 5.6, 29.1, 29.2
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { enqueueSyncItem } from '../storage/db';
import { getCurrentZoneId, getUserId } from '../storage/mmkv';
import { isOnline } from '../sync/connectivityManager';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SOS'>;
};

interface FirstAidStation {
  stationId: string;
  name: string;
  zoneId: string;
  distanceMeters: number;
}

const CANCEL_WINDOW_MS = 3000;

export default function SOSScreen({ navigation }: Props) {
  const [countdown, setCountdown] = useState(3);
  const [cancelled, setCancelled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nearestStation, setNearestStation] = useState<FirstAidStation | null>(null);
  const [queued, setQueued] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          submitSOS();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function handleCancel() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCancelled(true);
    setTimeout(() => navigation.goBack(), 500);
  }

  async function submitSOS() {
    if (submitted || loading) return;
    setLoading(true);

    const payload = {
      attendeeId: getUserId(),
      zoneId: getCurrentZoneId(),
      timestamp: new Date().toISOString(),
    };

    if (!isOnline()) {
      await enqueueSyncItem('sos_signal', payload);
      setQueued(true);
      setLoading(false);
      setSubmitted(true);
      return;
    }

    try {
      const res = await apiClient.post<{ nearestStation: FirstAidStation }>(
        '/emergency/sos',
        payload
      );
      setNearestStation(res.data.nearestStation);
    } catch {
      // Idempotent — may already have an active SOS
      // Queue for retry
      await enqueueSyncItem('sos_signal', payload);
      setQueued(true);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (cancelled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.cancelledText}>SOS cancelled</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.countdownLabel}>Sending SOS in</Text>
          <Text style={styles.countdown}>{countdown}</Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel SOS"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        {loading ? (
          <ActivityIndicator color="#e94560" size="large" />
        ) : (
          <>
            <Text style={styles.helpIcon}>🆘</Text>
            <Text style={styles.helpTitle}>
              {queued ? 'SOS queued' : 'Help is on the way'}
            </Text>
            <Text style={styles.helpSubtitle}>
              {queued
                ? 'Your SOS will be sent when connectivity is restored. Move to the nearest exit.'
                : 'Emergency staff have been notified of your location.'}
            </Text>

            {nearestStation && (
              <View style={styles.stationCard}>
                <Text style={styles.stationLabel}>Nearest first-aid station</Text>
                <Text style={styles.stationName}>{nearestStation.name}</Text>
                <Text style={styles.stationDistance}>{nearestStation.distanceMeters}m away</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.medicalButton}
              onPress={() => navigation.replace('MedicalSOS')}
              accessibilityRole="button"
            >
              <Text style={styles.medicalButtonText}>This is a medical emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  countdownLabel: { color: '#fff', fontSize: 18, marginBottom: 16 },
  countdown: { color: '#e94560', fontSize: 80, fontWeight: '900', marginBottom: 32 },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  cancelButtonText: { color: '#1a0000', fontSize: 16, fontWeight: '700' },
  cancelledText: { color: '#a0a0b0', fontSize: 18 },
  helpIcon: { fontSize: 72, marginBottom: 16 },
  helpTitle: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  helpSubtitle: { color: '#a0a0b0', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  stationCard: {
    backgroundColor: '#2a0000',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  stationLabel: { color: '#a0a0b0', fontSize: 12, marginBottom: 4 },
  stationName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  stationDistance: { color: '#e94560', fontSize: 14, marginTop: 4 },
  medicalButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  medicalButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  doneButton: {
    backgroundColor: '#2a0000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a0000',
  },
  doneButtonText: { color: '#fff', fontSize: 15 },
});
