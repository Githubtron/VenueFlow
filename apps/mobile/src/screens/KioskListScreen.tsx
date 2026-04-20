/**
 * KioskListScreen — list + map view of kiosks with wait time badges.
 * Fetches GET /queues/{venueId}; refreshes every 60 s.
 * Wait time badges: green <5 min, amber 5-10 min, red >10 min.
 * Requirements: 3.2, 3.5
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { getCurrentVenueId } from '../storage/mmkv';
import { SOSFab } from '../components/SOSFab';
import { RootStackParamList } from '../navigation/AppNavigator';

interface KioskItem {
  kioskId: string;
  name: string;
  vendorName: string;
  zoneId: string;
  predictedWaitMinutes: number;
  isActive: boolean;
}

function waitBadgeColor(minutes: number): string {
  if (minutes < 5) return '#22c55e';
  if (minutes <= 10) return '#f59e0b';
  return '#ef4444';
}

function waitLabel(minutes: number): string {
  if (minutes < 1) return '<1 min';
  return `~${minutes} min`;
}

export default function KioskListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const venueId = getCurrentVenueId() ?? '';
  const [kiosks, setKiosks] = useState<KioskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchKiosks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get<{ kiosks: KioskItem[] }>(`/queues/${venueId}`);
      setKiosks(res.data.kiosks ?? []);
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchKiosks();
    intervalRef.current = setInterval(() => fetchKiosks(true), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchKiosks]);

  function handleRefresh() {
    setRefreshing(true);
    fetchKiosks(true);
  }

  function renderKiosk({ item }: { item: KioskItem }) {
    const color = waitBadgeColor(item.predictedWaitMinutes);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('KioskDetail', { kioskId: item.kioskId })}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} by ${item.vendorName}, wait ${waitLabel(item.predictedWaitMinutes)}`}
      >
        <View style={styles.cardBody}>
          <Text style={styles.kioskName}>{item.name}</Text>
          <Text style={styles.vendorName}>{item.vendorName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{waitLabel(item.predictedWaitMinutes)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order from seat</Text>
        <Text style={styles.subtitle}>Select a kiosk to order</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={kiosks.filter((k) => k.isActive)}
          keyExtractor={(k) => k.kioskId}
          renderItem={renderKiosk}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#e94560"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active kiosks available</Text>
          }
        />
      )}

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#a0a0b0', fontSize: 13, marginTop: 4 },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  kioskName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  vendorName: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 64,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
});
