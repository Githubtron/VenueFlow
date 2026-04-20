/**
 * Medical SOS screen: severity selector, description, POST /medical/sos.
 * "First aid dispatched" + AED locations.
 * Requirements: 29.1, 29.2
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { enqueueSyncItem } from '../storage/db';
import { getCurrentZoneId, getUserId } from '../storage/mmkv';
import { isOnline } from '../sync/connectivityManager';
import { RootStackParamList } from '../navigation/AppNavigator';

type Severity = 'low' | 'medium' | 'high' | 'critical';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MedicalSOS'>;
};

interface AEDLocation {
  aedId: string;
  name: string;
  zoneId: string;
  distanceMeters: number;
}

interface MedicalSOSResponse {
  estimatedArrivalMinutes: number;
  aedLocations: AEDLocation[];
}

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

export default function MedicalSOSScreen({ navigation }: Props) {
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MedicalSOSResponse | null>(null);
  const [queued, setQueued] = useState(false);

  async function handleSubmit() {
    setLoading(true);

    const payload = {
      attendeeId: getUserId(),
      zoneId: getCurrentZoneId(),
      severity,
      description,
      timestamp: new Date().toISOString(),
    };

    if (!isOnline()) {
      await enqueueSyncItem('sos_signal', { ...payload, type: 'medical' });
      setQueued(true);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post<MedicalSOSResponse>('/medical/sos', payload);
      setResponse(res.data);
    } catch {
      await enqueueSyncItem('sos_signal', { ...payload, type: 'medical' });
      setQueued(true);
    } finally {
      setLoading(false);
    }
  }

  if (queued) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.queuedIcon}>📡</Text>
          <Text style={styles.queuedTitle}>Medical SOS queued</Text>
          <Text style={styles.queuedBody}>
            Your request will be sent when connectivity is restored. Move to the nearest exit and
            call for help from nearby staff.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (response) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.dispatchedIcon}>🏥</Text>
          <Text style={styles.dispatchedTitle}>First aid staff dispatched</Text>
          <Text style={styles.eta}>
            Estimated arrival: ~{response.estimatedArrivalMinutes} min
          </Text>

          {response.aedLocations.length > 0 && (
            <View style={styles.aedSection}>
              <Text style={styles.aedTitle}>Nearby AED locations</Text>
              {response.aedLocations.map((aed) => (
                <View key={aed.aedId} style={styles.aedCard}>
                  <Text style={styles.aedIcon}>⚡</Text>
                  <View style={styles.aedInfo}>
                    <Text style={styles.aedName}>{aed.name}</Text>
                    <Text style={styles.aedDistance}>{aed.distanceMeters}m away</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Medical emergency</Text>
        <Text style={styles.subtitle}>Describe the situation so first aid can prepare</Text>

        <Text style={styles.sectionLabel}>Severity</Text>
        <View style={styles.severityRow}>
          {SEVERITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.severityButton,
                severity === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
              ]}
              onPress={() => setSeverity(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`Severity: ${opt.label}`}
              accessibilityState={{ selected: severity === opt.value }}
            >
              <Text
                style={[
                  styles.severityButtonText,
                  severity === opt.value && styles.severityButtonTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Description (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the emergency..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Emergency description"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Send medical SOS"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>🆘 Send Medical SOS</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },
  scroll: { padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#a0a0b0', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  sectionLabel: { color: '#a0a0b0', fontSize: 13, marginBottom: 10 },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  severityButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a0000',
    backgroundColor: '#2a0000',
  },
  severityButtonText: { color: '#a0a0b0', fontSize: 13, fontWeight: '600' },
  severityButtonTextActive: { color: '#fff' },
  textArea: {
    backgroundColor: '#2a0000',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#4a0000',
    minHeight: 100,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dispatchedIcon: { fontSize: 72, textAlign: 'center', marginBottom: 16 },
  dispatchedTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  eta: { color: '#22c55e', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  aedSection: { marginBottom: 24 },
  aedTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  aedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a0000',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  aedIcon: { fontSize: 24 },
  aedInfo: { flex: 1 },
  aedName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  aedDistance: { color: '#a0a0b0', fontSize: 13 },
  queuedIcon: { fontSize: 64, marginBottom: 16 },
  queuedTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  queuedBody: { color: '#a0a0b0', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  doneButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
