/**
 * Reward detail screen: description, points cost, "Redeem" button → voucher code/QR.
 * Requirements: 22.1, 22.2
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
import QRCode from 'react-native-qrcode-svg';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { getUserId, getPointsBalance, setPointsBalance } from '../storage/mmkv';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RewardDetail'>;
  route: RouteProp<RootStackParamList, 'RewardDetail'>;
};

interface RewardDetail {
  rewardId: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
  terms?: string;
}

interface RedemptionResult {
  voucherCode: string;
  validUntil: string;
}

export default function RewardDetailScreen({ navigation, route }: Props) {
  const { rewardId } = route.params;
  const attendeeId = getUserId();

  const [reward, setReward] = useState<RewardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redemption, setRedemption] = useState<RedemptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance = getPointsBalance();

  useEffect(() => {
    apiClient
      .get<RewardDetail>(`/rewards/catalog/${rewardId}`)
      .then((res) => setReward(res.data))
      .catch(() => setError('Could not load reward details'))
      .finally(() => setLoading(false));
  }, [rewardId]);

  async function handleRedeem() {
    if (!reward) return;
    setRedeeming(true);
    setError(null);

    try {
      const res = await apiClient.post<RedemptionResult>(
        `/rewards/${attendeeId}/redeem/${rewardId}`
      );
      setRedemption(res.data);
      // Deduct points locally
      setPointsBalance(Math.max(0, balance - reward.pointsCost));
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Redemption failed. Please try again.');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#e94560" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (redemption) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Reward redeemed!</Text>
          <Text style={styles.voucherLabel}>Your voucher code</Text>
          <Text style={styles.voucherCode}>{redemption.voucherCode}</Text>

          <View style={styles.qrContainer}>
            <QRCode value={redemption.voucherCode} size={180} backgroundColor="#fff" color="#000" />
          </View>

          <Text style={styles.validUntil}>
            Valid until: {new Date(redemption.validUntil).toLocaleDateString()}
          </Text>

          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const canAfford = reward ? balance >= reward.pointsCost : false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {reward && (
          <>
            <Text style={styles.rewardName}>{reward.name}</Text>
            <Text style={styles.rewardCategory}>{reward.category}</Text>
            <Text style={styles.rewardDescription}>{reward.description}</Text>

            {reward.terms && (
              <Text style={styles.terms}>{reward.terms}</Text>
            )}

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Cost</Text>
              <Text style={styles.costValue}>{reward.pointsCost} points</Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Your balance</Text>
              <Text style={[styles.balanceValue, !canAfford && styles.balanceInsufficient]}>
                {balance} points
              </Text>
            </View>

            {!canAfford && (
              <Text style={styles.insufficientText}>
                You need {reward.pointsCost - balance} more points to redeem this reward.
              </Text>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.redeemButton, (!canAfford || redeeming) && styles.buttonDisabled]}
              onPress={handleRedeem}
              disabled={!canAfford || redeeming}
              accessibilityRole="button"
              accessibilityLabel={`Redeem for ${reward.pointsCost} points`}
            >
              {redeeming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.redeemButtonText}>
                  Redeem for {reward.pointsCost} pts
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 24 },
  rewardName: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  rewardCategory: { color: '#e94560', fontSize: 13, marginBottom: 16 },
  rewardDescription: { color: '#a0a0b0', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  terms: { color: '#555', fontSize: 12, lineHeight: 18, marginBottom: 20 },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  costLabel: { color: '#a0a0b0', fontSize: 14 },
  costValue: { color: '#e94560', fontSize: 16, fontWeight: '700' },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  balanceLabel: { color: '#a0a0b0', fontSize: 14 },
  balanceValue: { color: '#22c55e', fontSize: 16, fontWeight: '700' },
  balanceInsufficient: { color: '#ef4444' },
  insufficientText: { color: '#f59e0b', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  errorBanner: { backgroundColor: '#e94560', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#fff', fontSize: 14 },
  redeemButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  redeemButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successIcon: { fontSize: 72, textAlign: 'center', marginBottom: 16 },
  successTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  voucherLabel: { color: '#a0a0b0', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  voucherCode: { color: '#e94560', fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 4, marginBottom: 24 },
  qrContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignSelf: 'center', marginBottom: 16 },
  validUntil: { color: '#a0a0b0', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  doneButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignSelf: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
