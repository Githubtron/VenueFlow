/**
 * OrderStatusScreen — polls order status; shows "Get Directions" CTA when ready.
 * Requirements: 3.4
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { SOSFab } from '../components/SOSFab';
import { RootStackParamList } from '../navigation/AppNavigator';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'collected';

interface OrderDetail {
  orderId: string;
  kioskId: string;
  status: OrderStatus;
  seatSection: string;
  items: Array<{ itemId: string; quantity: number }>;
}

type OrderStatusRouteProp = RouteProp<RootStackParamList, 'OrderStatus'>;

const POLL_INTERVAL_MS = 10_000;

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order received',
  preparing: 'Being prepared',
  ready: 'Ready for collection! 🎉',
  collected: 'Collected',
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '🕐',
  preparing: '👨‍🍳',
  ready: '✅',
  collected: '🛍️',
};

const STEPS: OrderStatus[] = ['pending', 'preparing', 'ready', 'collected'];

export default function OrderStatusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<OrderStatusRouteProp>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOrder(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
      setOrder(res.data);

      // Stop polling once collected
      if (res.data.status === 'collected' && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrder();
    intervalRef.current = setInterval(() => fetchOrder(true), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId]);

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#e94560" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    );
  }

  const currentStepIndex = STEPS.indexOf(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Status icon + label */}
        <Text style={styles.statusIcon}>{STATUS_ICONS[order.status]}</Text>
        <Text style={styles.statusLabel}>{STATUS_LABELS[order.status]}</Text>
        <Text style={styles.orderId}>Order #{orderId.slice(0, 8).toUpperCase()}</Text>

        {/* Progress steps */}
        <View style={styles.steps}>
          {STEPS.map((step, i) => {
            const done = i <= currentStepIndex;
            return (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepDot, done && styles.stepDotDone]} />
                <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Get Directions CTA — shown when ready */}
        {order.status === 'ready' && (
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={() =>
              navigation.navigate('Navigation', {
                destination: order.kioskId,
                destinationType: 'kiosk',
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Get directions to kiosk"
          >
            <Text style={styles.directionsBtnText}>📍 Get directions to kiosk</Text>
          </TouchableOpacity>
        )}

        {order.status === 'collected' && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.popToTop()}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusIcon: { fontSize: 64, marginBottom: 16 },
  statusLabel: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  orderId: { color: '#a0a0b0', fontSize: 13, marginTop: 6, marginBottom: 32 },
  steps: { width: '100%', marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2a2a4a',
    marginRight: 12,
  },
  stepDotDone: { backgroundColor: '#e94560' },
  stepLabel: { color: '#666', fontSize: 14 },
  stepLabelDone: { color: '#fff', fontWeight: '600' },
  directionsBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  directionsBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#666', textAlign: 'center', marginTop: 60 },
});
