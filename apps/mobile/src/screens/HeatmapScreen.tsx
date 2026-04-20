/**
 * Heatmap view with WebSocket subscription.
 * Color-coded zones (green/yellow/red/unavailable), headcount labels, floor level toggle.
 * Gate recommendation card + predicted wait time.
 * Offline banner when no connectivity.
 * Requirements: 2.1, 2.2, 2.3, 1.1, 8.4
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useWebSocket } from '../hooks/useWebSocket';
import { OfflineBanner } from '../components/OfflineBanner';
import { SOSFab } from '../components/SOSFab';
import { apiClient } from '../api/client';
import { getCurrentVenueId } from '../storage/mmkv';
import { isOnline } from '../sync/connectivityManager';

interface AEDStation {
  stationId: string;
  name: string;
  zoneId: string;
  floorLevel: number;
  type: 'aed' | 'first_aid';
}

interface ZoneSnapshot {
  zoneId: string;
  name: string;
  floorLevel: number;
  currentCount: number;
  densityPercent: number;
  status: 'green' | 'amber' | 'red' | 'unavailable';
}

interface HeatmapUpdate {
  venueId: string;
  zones: ZoneSnapshot[];
  updatedAt: string;
}

interface GateRecommendation {
  gateId: string;
  gateName: string;
  predictedWaitMinutes: number;
  reason: string;
}

const STATUS_COLORS: Record<ZoneSnapshot['status'], string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  unavailable: '#6b7280',
};

const STATUS_LABELS: Record<ZoneSnapshot['status'], string> = {
  green: 'Low',
  amber: 'Moderate',
  red: 'High',
  unavailable: 'No data',
};

export default function HeatmapScreen() {
  const venueId = getCurrentVenueId() ?? '';
  const [zones, setZones] = useState<ZoneSnapshot[]>([]);
  const [floorLevel, setFloorLevel] = useState(1);
  const [gateRec, setGateRec] = useState<GateRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [floors, setFloors] = useState<number[]>([1]);
  const [aedStations, setAedStations] = useState<AEDStation[]>([]);

  // Load initial heatmap data
  useEffect(() => {
    if (!venueId) return;
    apiClient
      .get<{ zones: ZoneSnapshot[] }>(`/heatmap/${venueId}`)
      .then((res) => {
        setZones(res.data.zones);
        const uniqueFloors = [...new Set(res.data.zones.map((z) => z.floorLevel))].sort();
        setFloors(uniqueFloors);
      })
      .catch(() => {/* use cached or empty */})
      .finally(() => setLoading(false));

    // Load gate recommendation
    apiClient
      .get<GateRecommendation>(`/entry/recommendation/me`)
      .then((res) => setGateRec(res.data))
      .catch(() => {/* no recommendation available */});

    // Load AED and medical stations (Requirements: 29.3)
    apiClient
      .get<{ stations: AEDStation[] }>(`/medical/stations/${venueId}`)
      .then((res) => setAedStations(res.data.stations))
      .catch(() => {/* use cached or empty */});
  }, [venueId]);

  const handleHeatmapUpdate = useCallback((update: HeatmapUpdate) => {
    setZones(update.zones);
    const uniqueFloors = [...new Set(update.zones.map((z) => z.floorLevel))].sort();
    setFloors(uniqueFloors);
  }, []);

  const { connected } = useWebSocket<HeatmapUpdate>(
    `heatmap:${venueId}`,
    handleHeatmapUpdate
  );

  const visibleZones = zones.filter((z) => z.floorLevel === floorLevel);

  return (
    <SafeAreaView style={styles.container}>
      {!isOnline() && <OfflineBanner />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Gate recommendation card */}
        {gateRec && (
          <View style={styles.gateCard}>
            <Text style={styles.gateCardTitle}>Recommended Gate</Text>
            <Text style={styles.gateName}>{gateRec.gateName}</Text>
            <Text style={styles.gateWait}>~{gateRec.predictedWaitMinutes} min wait</Text>
            <Text style={styles.gateReason}>{gateRec.reason}</Text>
          </View>
        )}

        {/* Floor level toggle */}
        <View style={styles.floorToggle}>
          {floors.map((floor) => (
            <TouchableOpacity
              key={floor}
              style={[styles.floorButton, floorLevel === floor && styles.floorButtonActive]}
              onPress={() => setFloorLevel(floor)}
              accessibilityRole="button"
              accessibilityLabel={`Floor ${floor}`}
              accessibilityState={{ selected: floorLevel === floor }}
            >
              <Text
                style={[
                  styles.floorButtonText,
                  floorLevel === floor && styles.floorButtonTextActive,
                ]}
              >
                Floor {floor}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live indicator */}
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: connected ? '#22c55e' : '#6b7280' }]} />
          <Text style={styles.liveText}>{connected ? 'Live' : 'Offline'}</Text>
        </View>

        {/* Zone grid */}
        {loading ? (
          <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.zoneGrid}>
            {visibleZones.map((zone) => (
              <View
                key={zone.zoneId}
                style={[styles.zoneCard, { borderLeftColor: STATUS_COLORS[zone.status] }]}
                accessibilityLabel={`${zone.name}: ${STATUS_LABELS[zone.status]} density, ${zone.currentCount} people`}
              >
                <View style={styles.zoneHeader}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[zone.status] }]}
                  >
                    <Text style={styles.statusBadgeText}>{STATUS_LABELS[zone.status]}</Text>
                  </View>
                </View>
                <Text style={styles.zoneCount}>{zone.currentCount.toLocaleString()} people</Text>
                <View style={styles.densityBar}>
                  <View
                    style={[
                      styles.densityFill,
                      {
                        width: `${Math.min(zone.densityPercent, 100)}%` as any,
                        backgroundColor: STATUS_COLORS[zone.status],
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* AED and first-aid station pins — Requirements: 29.3 */}
          {aedStations.filter((s) => s.floorLevel === floorLevel).length > 0 && (
            <View style={styles.aedSection}>
              <Text style={styles.aedSectionTitle}>Medical stations — Floor {floorLevel}</Text>
              {aedStations
                .filter((s) => s.floorLevel === floorLevel)
                .map((station) => (
                  <View key={station.stationId} style={styles.aedRow}>
                    <Text style={styles.aedIcon}>
                      {station.type === 'aed' ? '⚡' : '🏥'}
                    </Text>
                    <Text style={styles.aedName}>{station.name}</Text>
                    <Text style={styles.aedZone}>Zone {station.zoneId}</Text>
                  </View>
                ))}
            </View>
          )}
        )}
      </ScrollView>

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 16, paddingBottom: 80 },
  gateCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  gateCardTitle: { color: '#a0a0b0', fontSize: 12, marginBottom: 4 },
  gateName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  gateWait: { color: '#22c55e', fontSize: 15, marginTop: 4 },
  gateReason: { color: '#a0a0b0', fontSize: 13, marginTop: 4 },
  floorToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  floorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  floorButtonActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  floorButtonText: { color: '#a0a0b0', fontSize: 13 },
  floorButtonTextActive: { color: '#fff', fontWeight: '600' },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: '#a0a0b0', fontSize: 12 },
  zoneGrid: { gap: 10 },
  zoneCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
  },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  zoneName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  zoneCount: { color: '#a0a0b0', fontSize: 13, marginBottom: 8 },
  densityBar: {
    height: 4,
    backgroundColor: '#2a2a4a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  densityFill: { height: '100%', borderRadius: 2 },
  aedSection: { marginTop: 20 },
  aedSectionTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  aedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  aedIcon: { fontSize: 18 },
  aedName: { color: '#fff', fontSize: 13, flex: 1 },
  aedZone: { color: '#a0a0b0', fontSize: 12 },
});
