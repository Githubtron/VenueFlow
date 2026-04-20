/**
 * Parking zone map and transport guidance views.
 * Parking zone color overlay, shuttle schedule, staggered exit recommendations, ride-hailing deep links.
 * Requirements: 31.1, 31.2, 31.3, 31.4
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../api/client';
import { getCurrentVenueId } from '../storage/mmkv';
import { SOSFab } from '../components/SOSFab';

interface ParkingZone {
  parkingZoneId: string;
  name: string;
  totalSpaces: number;
  availableSpaces: number;
  status: 'available' | 'limited' | 'full';
}

interface ShuttleRoute {
  routeId: string;
  name: string;
  nextDeparture: string;
  frequency: string;
  isLive: boolean;
}

interface ExitRecommendation {
  seatSection: string;
  recommendedExitTime: string;
  gate: string;
  reason: string;
}

const VENUE_EXIT_COORDS = { lat: 28.6139, lng: 77.2090 }; // placeholder

function getParkingStatusColor(status: ParkingZone['status']): string {
  switch (status) {
    case 'available': return '#22c55e';
    case 'limited': return '#f59e0b';
    case 'full': return '#ef4444';
  }
}

function openUber() {
  const url = `uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${VENUE_EXIT_COORDS.lat}&dropoff[longitude]=${VENUE_EXIT_COORDS.lng}&dropoff[nickname]=Venue%20Exit`;
  Linking.openURL(url).catch(() => {
    Linking.openURL('https://m.uber.com');
  });
}

function openOla() {
  const url = `olacabs://app/launch?lat=${VENUE_EXIT_COORDS.lat}&lng=${VENUE_EXIT_COORDS.lng}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL('https://book.olacabs.com');
  });
}

export default function TransportScreen() {
  const venueId = getCurrentVenueId() ?? '';
  const [parkingZones, setParkingZones] = useState<ParkingZone[]>([]);
  const [shuttles, setShuttles] = useState<ShuttleRoute[]>([]);
  const [exitRecs, setExitRecs] = useState<ExitRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransportData();
  }, [venueId]);

  async function loadTransportData() {
    setLoading(true);
    try {
      const [parkingRes, shuttleRes, exitRes] = await Promise.allSettled([
        apiClient.get<{ zones: ParkingZone[] }>(`/transport/${venueId}/parking`),
        apiClient.get<{ routes: ShuttleRoute[] }>(`/transport/${venueId}/shuttles`),
        apiClient.get<{ recommendations: ExitRecommendation[] }>(`/transport/${venueId}/exit-recommendations`),
      ]);

      if (parkingRes.status === 'fulfilled') setParkingZones(parkingRes.value.data.zones);
      if (shuttleRes.status === 'fulfilled') setShuttles(shuttleRes.value.data.routes);
      if (exitRes.status === 'fulfilled') setExitRecs(exitRes.value.data.recommendations);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Parking availability</Text>
        {loading ? (
          <ActivityIndicator color="#e94560" />
        ) : (
          parkingZones.map((zone) => (
            <View key={zone.parkingZoneId} style={styles.parkingCard}>
              <View
                style={[styles.parkingIndicator, { backgroundColor: getParkingStatusColor(zone.status) }]}
              />
              <View style={styles.parkingInfo}>
                <Text style={styles.parkingName}>{zone.name}</Text>
                <Text style={styles.parkingSpaces}>
                  {zone.availableSpaces} / {zone.totalSpaces} spaces available
                </Text>
              </View>
              <Text style={[styles.parkingStatus, { color: getParkingStatusColor(zone.status) }]}>
                {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Shuttle schedule</Text>
        {shuttles.length === 0 && !loading ? (
          <Text style={styles.emptyText}>No shuttle routes available</Text>
        ) : (
          shuttles.map((shuttle) => (
            <View key={shuttle.routeId} style={styles.shuttleCard}>
              <View style={styles.shuttleHeader}>
                <Text style={styles.shuttleName}>{shuttle.name}</Text>
                {shuttle.isLive && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.shuttleNext}>Next: {shuttle.nextDeparture}</Text>
              <Text style={styles.shuttleFreq}>Every {shuttle.frequency}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Staggered exit recommendations</Text>
        {exitRecs.length === 0 && !loading ? (
          <Text style={styles.emptyText}>Exit recommendations will appear after the event</Text>
        ) : (
          exitRecs.map((rec, i) => (
            <View key={i} style={styles.exitCard}>
              <Text style={styles.exitSection}>Section {rec.seatSection}</Text>
              <Text style={styles.exitTime}>Leave at: {rec.recommendedExitTime}</Text>
              <Text style={styles.exitGate}>Via: {rec.gate}</Text>
              <Text style={styles.exitReason}>{rec.reason}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Ride-hailing</Text>
        <View style={styles.rideRow}>
          <TouchableOpacity
            style={styles.rideButton}
            onPress={openUber}
            accessibilityRole="button"
            accessibilityLabel="Book Uber from venue exit"
          >
            <Text style={styles.rideButtonText}>🚗 Uber</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rideButton}
            onPress={openOla}
            accessibilityRole="button"
            accessibilityLabel="Book Ola from venue exit"
          >
            <Text style={styles.rideButtonText}>🚕 Ola</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.rideNote}>Pre-filled with venue exit coordinates</Text>
      </ScrollView>

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 16, paddingBottom: 80 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 12 },
  parkingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  parkingIndicator: { width: 12, height: 12, borderRadius: 6 },
  parkingInfo: { flex: 1 },
  parkingName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  parkingSpaces: { color: '#a0a0b0', fontSize: 12, marginTop: 2 },
  parkingStatus: { fontSize: 13, fontWeight: '600' },
  shuttleCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  shuttleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  shuttleName: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  liveBadge: { backgroundColor: '#22c55e', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  shuttleNext: { color: '#e94560', fontSize: 13 },
  shuttleFreq: { color: '#a0a0b0', fontSize: 12, marginTop: 2 },
  exitCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  exitSection: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  exitTime: { color: '#e94560', fontSize: 13 },
  exitGate: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  exitReason: { color: '#666', fontSize: 12, marginTop: 4 },
  rideRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  rideButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  rideButtonText: { color: '#fff', fontSize: 16 },
  rideNote: { color: '#666', fontSize: 12, textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 13, marginBottom: 8 },
});
