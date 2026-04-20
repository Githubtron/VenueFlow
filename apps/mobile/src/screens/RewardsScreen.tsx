/**
 * Rewards dashboard: points balance, history, catalog, leaderboard tab.
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { getPointsBalance, setPointsBalance, getCurrentEventId, getUserId } from '../storage/mmkv';
import { SOSFab } from '../components/SOSFab';
import { RootStackParamList } from '../navigation/AppNavigator';

type Tab = 'catalog' | 'history' | 'leaderboard';

interface Reward {
  rewardId: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
}

interface PointsHistoryItem {
  points: number;
  reason: string;
  timestamp: string;
}

interface LeaderboardEntry {
  rank: number;
  attendeeId: string;
  displayName: string;
  points: number;
  isCurrentUser: boolean;
}

export default function RewardsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [balance, setBalance] = useState(getPointsBalance());
  const [catalog, setCatalog] = useState<Reward[]>([]);
  const [history, setHistory] = useState<PointsHistoryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const attendeeId = getUserId();
  const eventId = getCurrentEventId();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [balanceRes, catalogRes] = await Promise.all([
        apiClient.get<{ points: number }>(`/rewards/${attendeeId}/balance`),
        apiClient.get<{ rewards: Reward[] }>('/rewards/catalog'),
      ]);
      setBalance(balanceRes.data.points);
      setPointsBalance(balanceRes.data.points);
      setCatalog(catalogRes.data.rewards);
    } catch {
      // Use cached balance
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await apiClient.get<{ history: PointsHistoryItem[] }>(
        `/rewards/${attendeeId}/history`
      );
      setHistory(res.data.history);
    } catch {
      // ignore
    }
  }

  async function loadLeaderboard() {
    try {
      const res = await apiClient.get<{ entries: LeaderboardEntry[] }>(
        `/rewards/leaderboard/${eventId}`
      );
      setLeaderboard(res.data.entries);
    } catch {
      // ignore
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === 'history' && history.length === 0) loadHistory();
    if (tab === 'leaderboard' && leaderboard.length === 0) loadLeaderboard();
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Balance header */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your points</Text>
        <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
        <Text style={styles.balanceSubtitle}>Earn more by using VenueFlow features</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['catalog', 'history', 'leaderboard'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {activeTab === 'catalog' && (
            <>
              {catalog.map((reward) => (
                <TouchableOpacity
                  key={reward.rewardId}
                  style={styles.rewardCard}
                  onPress={() => navigation.navigate('RewardDetail', { rewardId: reward.rewardId })}
                  accessibilityRole="button"
                  accessibilityLabel={`${reward.name}, ${reward.pointsCost} points`}
                >
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardName}>{reward.name}</Text>
                    <Text style={styles.rewardDesc}>{reward.description}</Text>
                  </View>
                  <View style={styles.rewardCost}>
                    <Text style={styles.rewardCostValue}>{reward.pointsCost}</Text>
                    <Text style={styles.rewardCostLabel}>pts</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No points history yet</Text>
              ) : (
                history.map((item, i) => (
                  <View key={i} style={styles.historyRow}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyReason}>{item.reason}</Text>
                      <Text style={styles.historyTime}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.historyPoints, item.points > 0 ? styles.pointsPositive : styles.pointsNegative]}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'leaderboard' && (
            <>
              {leaderboard.map((entry) => (
                <View
                  key={entry.attendeeId}
                  style={[styles.leaderboardRow, entry.isCurrentUser && styles.leaderboardRowHighlight]}
                >
                  <Text style={styles.leaderboardRank}>#{entry.rank}</Text>
                  <Text style={styles.leaderboardName}>
                    {entry.isCurrentUser ? 'You' : entry.displayName}
                  </Text>
                  <Text style={styles.leaderboardPoints}>{entry.points.toLocaleString()} pts</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  balanceCard: {
    backgroundColor: '#e94560',
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  balanceValue: { color: '#fff', fontSize: 48, fontWeight: '900', marginVertical: 4 },
  balanceSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#16213e' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#e94560' },
  tabText: { color: '#666', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 80 },
  rewardCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardInfo: { flex: 1 },
  rewardName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  rewardDesc: { color: '#a0a0b0', fontSize: 13 },
  rewardCost: { alignItems: 'center', marginLeft: 12 },
  rewardCostValue: { color: '#e94560', fontSize: 20, fontWeight: '700' },
  rewardCostLabel: { color: '#a0a0b0', fontSize: 11 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  historyInfo: { flex: 1 },
  historyReason: { color: '#fff', fontSize: 14 },
  historyTime: { color: '#666', fontSize: 12, marginTop: 2 },
  historyPoints: { fontSize: 16, fontWeight: '700' },
  pointsPositive: { color: '#22c55e' },
  pointsNegative: { color: '#ef4444' },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  leaderboardRowHighlight: { borderWidth: 1, borderColor: '#e94560' },
  leaderboardRank: { color: '#a0a0b0', fontSize: 14, width: 32 },
  leaderboardName: { color: '#fff', fontSize: 14, flex: 1 },
  leaderboardPoints: { color: '#e94560', fontSize: 14, fontWeight: '600' },
});
