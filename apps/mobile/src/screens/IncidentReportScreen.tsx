/**
 * Incident reporting screen.
 * Type selector, description, optional photo, auto-filled zone.
 * POST /incidents; show reference number; +40 points toast.
 * Offline: queue in sync queue; show "Report queued".
 * Requirements: 23.1, 9.4
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
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { enqueueSyncItem } from '../storage/db';
import { getCurrentZoneId, getUserId } from '../storage/mmkv';
import { isOnline } from '../sync/connectivityManager';
import { PointsToast } from '../components/PointsToast';
import { RootStackParamList } from '../navigation/AppNavigator';

type IncidentType = 'medical' | 'safety' | 'infrastructure' | 'suspicious' | 'other';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'IncidentReport'>;
};

const INCIDENT_TYPES: Array<{ value: IncidentType; label: string; icon: string }> = [
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'safety', label: 'Safety', icon: '⚠️' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🔧' },
  { value: 'suspicious', label: 'Suspicious Activity', icon: '👁️' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export default function IncidentReportScreen({ navigation }: Props) {
  const [incidentType, setIncidentType] = useState<IncidentType>('other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [showPointsToast, setShowPointsToast] = useState(false);

  const zoneId = getCurrentZoneId();

  async function handleSubmit() {
    if (!description.trim()) {
      Alert.alert('Description required', 'Please describe the incident.');
      return;
    }

    setLoading(true);

    const payload = {
      reporterId: getUserId(),
      zoneId,
      type: incidentType,
      description,
      submittedAt: new Date().toISOString(),
    };

    if (!isOnline()) {
      await enqueueSyncItem('incident_report', payload);
      setQueued(true);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post<{ incidentId: string; referenceNumber: string }>(
        '/incidents',
        payload
      );
      setReferenceNumber(res.data.referenceNumber ?? res.data.incidentId);
      setShowPointsToast(true);
    } catch {
      await enqueueSyncItem('incident_report', payload);
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
          <Text style={styles.queuedTitle}>Report queued</Text>
          <Text style={styles.queuedBody}>
            Your report will be submitted automatically when connectivity is restored.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (referenceNumber) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.refLabel}>Reference number</Text>
          <Text style={styles.refNumber}>{referenceNumber}</Text>
          <Text style={styles.successBody}>
            Thank you for helping keep the venue safe. Staff have been notified.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        {showPointsToast && (
          <PointsToast points={40} message="Valid incident report" onDismiss={() => setShowPointsToast(false)} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Report an incident</Text>

        {zoneId && (
          <View style={styles.zoneRow}>
            <Text style={styles.zoneLabel}>📍 Zone: {zoneId}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Incident type</Text>
        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                incidentType === type.value && styles.typeButtonActive,
              ]}
              onPress={() => setIncidentType(type.value)}
              accessibilityRole="button"
              accessibilityLabel={type.label}
              accessibilityState={{ selected: incidentType === type.value }}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  incidentType === type.value && styles.typeLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you observed..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          accessibilityLabel="Incident description"
        />

        <TouchableOpacity
          style={[styles.submitButton, (loading || !description.trim()) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !description.trim()}
          accessibilityRole="button"
          accessibilityLabel="Submit incident report"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  zoneRow: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  zoneLabel: { color: '#a0a0b0', fontSize: 13 },
  sectionLabel: { color: '#a0a0b0', fontSize: 13, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  typeButton: {
    width: '30%',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  typeButtonActive: { borderColor: '#e94560', backgroundColor: '#2a1020' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { color: '#a0a0b0', fontSize: 11, textAlign: 'center' },
  typeLabelActive: { color: '#e94560', fontWeight: '600' },
  textArea: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    minHeight: 120,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  queuedIcon: { fontSize: 64, marginBottom: 16 },
  queuedTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  queuedBody: { color: '#a0a0b0', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  refLabel: { color: '#a0a0b0', fontSize: 13, marginBottom: 4 },
  refNumber: { color: '#e94560', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  successBody: { color: '#a0a0b0', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  doneButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
