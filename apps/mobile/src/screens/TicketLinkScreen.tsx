/**
 * Ticket linking screen: QR scanner + manual ticket ID entry; cache JWT on success.
 * Requirements: 6.5, 9.3, 9.5
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { saveTicket } from '../storage/db';
import { getCurrentEventId, getUserId } from '../storage/mmkv';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TicketLink'>;
};

export default function TicketLinkScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function linkTicket(ticketId: string) {
    if (!ticketId.trim()) return;
    setLoading(true);
    setError(null);
    setScanning(false);

    try {
      const eventId = getCurrentEventId();
      const attendeeId = getUserId();

      const res = await apiClient.post<{
        ticketId: string;
        jwt: string;
        seatSection: string;
        seatRow: string;
        seatNumber: string;
        eventId: string;
        attendeeId: string;
      }>('/tickets/link', { ticketId, eventId, attendeeId });

      await saveTicket({
        ticket_id: res.data.ticketId,
        attendee_id: res.data.attendeeId,
        event_id: res.data.eventId,
        seat_section: res.data.seatSection,
        seat_row: res.data.seatRow,
        seat_number: res.data.seatNumber,
        jwt: res.data.jwt,
        venue_public_key: null,
      });

      navigation.replace('Main');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Failed to link ticket. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    linkTicket(data);
  }

  async function handleScanPress() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera permission required', 'Please allow camera access to scan QR codes.');
        return;
      }
    }
    setScanning(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Link your ticket</Text>
      <Text style={styles.subtitle}>Scan your QR ticket or enter the ticket ID manually</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {scanning ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.scanner}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <TouchableOpacity
            style={styles.cancelScan}
            onPress={() => setScanning(false)}
            accessibilityRole="button"
          >
            <Text style={styles.cancelScanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanPress}
            accessibilityRole="button"
            accessibilityLabel="Scan QR ticket"
          >
            <Text style={styles.scanButtonText}>📷  Scan QR Code</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>— or enter manually —</Text>

          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={manualId}
              onChangeText={setManualId}
              placeholder="Ticket ID"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Ticket ID"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (loading || !manualId.trim()) && styles.buttonDisabled]}
            onPress={() => linkTicket(manualId)}
            disabled={loading || !manualId.trim()}
            accessibilityRole="button"
            accessibilityLabel="Link ticket"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Link Ticket</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.replace('Main')}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#a0a0b0', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  errorBanner: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: '#fff', fontSize: 14 },
  scannerContainer: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  scanner: { flex: 1 },
  cancelScan: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelScanText: { color: '#fff', fontSize: 15 },
  scanButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 20,
  },
  scanButtonText: { color: '#fff', fontSize: 15 },
  orText: { color: '#666', textAlign: 'center', marginBottom: 20 },
  field: { marginBottom: 16 },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  primaryButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipButton: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  skipText: { color: '#666', fontSize: 14 },
});
