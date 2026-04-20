/**
 * KioskDetailScreen — menu items, wait time, alternative banner, order CTA.
 * Shows alternative kiosk banner when wait > 10 min.
 * Requirements: 3.2, 3.5
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { getCurrentVenueId } from '../storage/mmkv';
import { SOSFab } from '../components/SOSFab';
import { RootStackParamList } from '../navigation/AppNavigator';

interface MenuItem {
  itemId: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

interface KioskDetail {
  kioskId: string;
  name: string;
  vendorName: string;
  predictedWaitMinutes: number;
  menu: MenuItem[];
}

interface AlternativeKiosk {
  kioskId: string;
  name: string;
  predictedWaitMinutes: number;
}

type KioskDetailRouteProp = RouteProp<RootStackParamList, 'KioskDetail'>;

export default function KioskDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<KioskDetailRouteProp>();
  const { kioskId } = route.params;
  const venueId = getCurrentVenueId() ?? '';

  const [kiosk, setKiosk] = useState<KioskDetail | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeKiosk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKiosk();
  }, [kioskId]);

  async function loadKiosk() {
    setLoading(true);
    try {
      const res = await apiClient.get<KioskDetail>(`/queues/${venueId}/kiosk/${kioskId}`);
      setKiosk(res.data);

      if (res.data.predictedWaitMinutes > 10) {
        const altRes = await apiClient.get<{ kiosks: AlternativeKiosk[] }>(
          `/queues/${venueId}/kiosk/${kioskId}/alternatives`
        );
        setAlternatives(altRes.data.kiosks ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#e94560" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!kiosk) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Kiosk not found</Text>
      </SafeAreaView>
    );
  }

  const waitColor =
    kiosk.predictedWaitMinutes < 5
      ? '#22c55e'
      : kiosk.predictedWaitMinutes <= 10
      ? '#f59e0b'
      : '#ef4444';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.kioskName}>{kiosk.name}</Text>
            <Text style={styles.vendorName}>{kiosk.vendorName}</Text>
          </View>
          <View style={[styles.waitBadge, { backgroundColor: waitColor }]}>
            <Text style={styles.waitText}>~{kiosk.predictedWaitMinutes} min</Text>
          </View>
        </View>

        {/* Alternative kiosk banner */}
        {kiosk.predictedWaitMinutes > 10 && alternatives.length > 0 && (
          <View style={styles.altBanner}>
            <Text style={styles.altBannerTitle}>⚡ Shorter wait nearby</Text>
            {alternatives.slice(0, 2).map((alt) => (
              <TouchableOpacity
                key={alt.kioskId}
                style={styles.altRow}
                onPress={() => navigation.replace('KioskDetail', { kioskId: alt.kioskId })}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${alt.name}, ${alt.predictedWaitMinutes} min wait`}
              >
                <Text style={styles.altName}>{alt.name}</Text>
                <Text style={styles.altWait}>~{alt.predictedWaitMinutes} min →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>Menu</Text>
        {kiosk.menu.map((item) => (
          <View
            key={item.itemId}
            style={[styles.menuItem, !item.available && styles.menuItemUnavailable]}
          >
            <View style={styles.menuItemInfo}>
              <Text style={[styles.menuItemName, !item.available && styles.textMuted]}>
                {item.name}
              </Text>
              <Text style={styles.menuItemDesc}>{item.description}</Text>
            </View>
            <Text style={[styles.menuItemPrice, !item.available && styles.textMuted]}>
              ₹{item.price.toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Order CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('OrderForm', { kioskId: kiosk.kioskId })}
          accessibilityRole="button"
          accessibilityLabel="Order from seat"
        >
          <Text style={styles.ctaText}>Order from seat</Text>
        </TouchableOpacity>
      </View>

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 16, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: { flex: 1 },
  kioskName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  vendorName: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  waitBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  waitText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  altBanner: {
    backgroundColor: '#1e3a2f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  altBannerTitle: { color: '#22c55e', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  altName: { color: '#fff', fontSize: 13 },
  altWait: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  menuItem: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemUnavailable: { opacity: 0.5 },
  menuItemInfo: { flex: 1 },
  menuItemName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  menuItemDesc: { color: '#a0a0b0', fontSize: 12, marginTop: 2 },
  menuItemPrice: { color: '#e94560', fontSize: 14, fontWeight: '700', marginLeft: 12 },
  textMuted: { color: '#666' },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  ctaButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#666', textAlign: 'center', marginTop: 60 },
});
