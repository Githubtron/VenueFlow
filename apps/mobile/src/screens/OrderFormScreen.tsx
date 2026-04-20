/**
 * OrderFormScreen — item selector, quantity, seat pre-filled from MMKV.
 * POSTs to /orders; preserves state on failure with retry.
 * Requirements: 3.4
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
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { getCurrentVenueId, getCurrentEventId, getUserId, storage } from '../storage/mmkv';
import { SOSFab } from '../components/SOSFab';
import { RootStackParamList } from '../navigation/AppNavigator';

interface MenuItem {
  itemId: string;
  name: string;
  price: number;
  available: boolean;
}

type OrderFormRouteProp = RouteProp<RootStackParamList, 'OrderForm'>;

const SEAT_SECTION_KEY = 'order.seatSection';

export default function OrderFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<OrderFormRouteProp>();
  const { kioskId } = route.params;

  const venueId = getCurrentVenueId() ?? '';
  const eventId = getCurrentEventId() ?? '';
  const attendeeId = getUserId() ?? '';

  // Pre-fill seat section from MMKV (set during ticket link)
  const [seatSection, setSeatSection] = useState<string>(
    storage.getString(SEAT_SECTION_KEY) ?? ''
  );
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMenu();
  }, [kioskId]);

  async function loadMenu() {
    setLoading(true);
    try {
      const res = await apiClient.get<{ menu: MenuItem[] }>(
        `/queues/${venueId}/kiosk/${kioskId}`
      );
      const available = (res.data.menu ?? []).filter((m) => m.available);
      setMenu(available);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function adjustQty(itemId: string, delta: number) {
    setQuantities((prev) => {
      const next = (prev[itemId] ?? 0) + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }

  function buildItems() {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
  }

  function totalPrice(): number {
    return menu.reduce((sum, item) => {
      return sum + item.price * (quantities[item.itemId] ?? 0);
    }, 0);
  }

  async function handleSubmit() {
    const items = buildItems();
    if (items.length === 0) {
      Alert.alert('No items selected', 'Please add at least one item to your order.');
      return;
    }
    if (!seatSection) {
      Alert.alert('Seat section required', 'Your seat section could not be determined.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<{ orderId: string; estimatedReadyMinutes: number }>(
        '/orders',
        { attendeeId, kioskId, eventId, seatSection, items }
      );
      navigation.replace('OrderStatus', { orderId: res.data.orderId });
    } catch {
      Alert.alert(
        'Order failed',
        'Could not place your order. Please try again.',
        [{ text: 'Retry', onPress: handleSubmit }, { text: 'Cancel', style: 'cancel' }]
      );
    } finally {
      setSubmitting(false);
    }
  }

  const items = buildItems();
  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Seat info */}
        <View style={styles.seatRow}>
          <Text style={styles.seatLabel}>Seat section</Text>
          <Text style={styles.seatValue}>{seatSection || '—'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select items</Text>

        {loading ? (
          <ActivityIndicator color="#e94560" style={{ marginTop: 20 }} />
        ) : menu.length === 0 ? (
          <Text style={styles.emptyText}>No items available</Text>
        ) : (
          menu.map((item) => {
            const qty = quantities[item.itemId] ?? 0;
            return (
              <View key={item.itemId} style={styles.menuRow}>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuName}>{item.name}</Text>
                  <Text style={styles.menuPrice}>₹{item.price.toFixed(2)}</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => adjustQty(item.itemId, -1)}
                    disabled={qty === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${item.name}`}
                  >
                    <Text style={[styles.qtyBtnText, qty === 0 && styles.qtyBtnDisabled]}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{qty}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => adjustQty(item.itemId, 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${item.name}`}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Submit */}
      <View style={styles.footer}>
        {hasItems && (
          <Text style={styles.totalText}>Total: ₹{totalPrice().toFixed(2)}</Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, (!hasItems || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!hasItems || submitting}
          accessibilityRole="button"
          accessibilityLabel="Place order"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Place order</Text>
          )}
        </TouchableOpacity>
      </View>

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 16, paddingBottom: 120 },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  seatLabel: { color: '#a0a0b0', fontSize: 13 },
  seatValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  menuRow: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuInfo: { flex: 1 },
  menuName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  menuPrice: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 18, lineHeight: 22 },
  qtyBtnDisabled: { color: '#444' },
  qtyValue: { color: '#fff', fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  totalText: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 10, textAlign: 'right' },
  submitBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
