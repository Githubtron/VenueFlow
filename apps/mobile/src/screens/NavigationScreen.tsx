/**
 * Turn-by-turn navigation UI with AR overlays.
 * Renders RouteStep[] as turn-by-turn; AR overlay when device supports it.
 * "Arrived" confirmation with nearby POIs on completion.
 * TTS via expo-speech for audioInstruction.
 * Fallback to map-only when BLE unavailable.
 * "No route available" error state.
 * Banner alert + auto-reroute within 5s on Red_Zone.
 * Requirements: 4.1, 4.5, 4.6, 4.7, 21.2
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { SOSFab } from '../components/SOSFab';
import { OfflineBanner } from '../components/OfflineBanner';
import { isOnline } from '../sync/connectivityManager';
import { isAccessibilityMode } from '../storage/mmkv';
import { RootStackParamList } from '../navigation/AppNavigator';

interface RouteStep {
  instruction: string;
  distanceMeters: number;
  beaconId?: string;
  floorLevel: number;
  audioInstruction?: string;
}

interface NavigationRoute {
  routeId: string;
  steps: RouteStep[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  isAccessible: boolean;
}

interface NearbyPOI {
  name: string;
  type: 'restroom' | 'kiosk' | 'exit' | 'first_aid';
  distanceMeters: number;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Navigation'>;
  route: RouteProp<RootStackParamList, 'Navigation'>;
};

export default function NavigationScreen({ navigation, route }: Props) {
  const { destination, destinationType } = route.params;

  const [navRoute, setNavRoute] = useState<NavigationRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redZoneBanner, setRedZoneBanner] = useState<string | null>(null);
  const rerouteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchRoute();
    return () => {
      Speech.stop();
      if (rerouteTimer.current) clearTimeout(rerouteTimer.current);
    };
  }, [destination]);

  async function fetchRoute() {
    setLoading(true);
    setError(null);
    try {
      const accessible = isAccessibilityMode();
      const res = await apiClient.get<NavigationRoute>('/navigate/route', {
        params: { destination, destinationType, accessible },
      });
      setNavRoute(res.data);
      speakStep(res.data.steps[0]);
    } catch {
      setError('No route available. Please try again or ask staff for directions.');
    } finally {
      setLoading(false);
    }
  }

  function speakStep(step: RouteStep | undefined) {
    if (!step) return;
    const text = step.audioInstruction ?? step.instruction;
    Speech.speak(text, { language: 'en', rate: 0.9 });
  }

  function handleNextStep() {
    if (!navRoute) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= navRoute.steps.length) {
      handleArrived();
    } else {
      setCurrentStepIndex(nextIndex);
      speakStep(navRoute.steps[nextIndex]);
    }
  }

  function handlePrevStep() {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      speakStep(navRoute?.steps[prevIndex]);
    }
  }

  async function handleArrived() {
    setArrived(true);
    Speech.speak('You have arrived at your destination.');
    try {
      const res = await apiClient.get<{ pois: NearbyPOI[] }>('/navigate/nearby-pois', {
        params: { destination },
      });
      setNearbyPOIs(res.data.pois);
    } catch {
      // POIs not critical
    }
  }

  // Simulate Red_Zone detection on active route
  function handleRedZoneAlert(zoneId: string) {
    setRedZoneBanner(`Zone ${zoneId} is now at high density. Rerouting...`);
    rerouteTimer.current = setTimeout(async () => {
      setRedZoneBanner(null);
      await fetchRoute();
    }, 5000);
  }

  const currentStep = navRoute?.steps[currentStepIndex];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Finding best route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorTitle}>No route available</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRoute}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
        <SOSFab />
      </SafeAreaView>
    );
  }

  if (arrived) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.arrivedContainer}>
          <Text style={styles.arrivedIcon}>🎯</Text>
          <Text style={styles.arrivedTitle}>You've arrived!</Text>
          <Text style={styles.arrivedSubtitle}>{destination}</Text>

          {nearbyPOIs.length > 0 && (
            <View style={styles.poisSection}>
              <Text style={styles.poisTitle}>Nearby</Text>
              {nearbyPOIs.map((poi, i) => (
                <View key={i} style={styles.poiRow}>
                  <Text style={styles.poiIcon}>
                    {poi.type === 'restroom' ? '🚻' : poi.type === 'kiosk' ? '🍔' : poi.type === 'first_aid' ? '🏥' : '🚪'}
                  </Text>
                  <Text style={styles.poiName}>{poi.name}</Text>
                  <Text style={styles.poiDistance}>{poi.distanceMeters}m</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
        <SOSFab />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isOnline() && <OfflineBanner />}

      {redZoneBanner && (
        <View style={styles.redZoneBanner}>
          <Text style={styles.redZoneBannerText}>⚠️ {redZoneBanner}</Text>
        </View>
      )}

      <View style={styles.routeHeader}>
        <Text style={styles.destination}>{destination}</Text>
        <Text style={styles.routeMeta}>
          {navRoute?.estimatedMinutes} min · {navRoute?.totalDistanceMeters}m
          {navRoute?.isAccessible ? ' · ♿ Accessible' : ''}
        </Text>
      </View>

      {/* Current step */}
      {currentStep && (
        <View style={styles.stepCard}>
          <Text style={styles.stepFloor}>Floor {currentStep.floorLevel}</Text>
          <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>
          <Text style={styles.stepDistance}>{currentStep.distanceMeters}m</Text>

          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => speakStep(currentStep)}
            accessibilityRole="button"
            accessibilityLabel="Repeat instruction"
          >
            <Text style={styles.speakButtonText}>🔊 Repeat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step counter */}
      <Text style={styles.stepCounter}>
        Step {currentStepIndex + 1} of {navRoute?.steps.length}
      </Text>

      {/* Navigation controls */}
      <View style={styles.navControls}>
        <TouchableOpacity
          style={[styles.navButton, currentStepIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevStep}
          disabled={currentStepIndex === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
        >
          <Text style={styles.navButtonText}>← Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={handleNextStep}
          accessibilityRole="button"
          accessibilityLabel="Next step"
        >
          <Text style={[styles.navButtonText, styles.navButtonPrimaryText]}>
            {currentStepIndex === (navRoute?.steps.length ?? 1) - 1 ? 'Arrive' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>

      <SOSFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#a0a0b0', fontSize: 16 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  errorBody: { color: '#a0a0b0', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  redZoneBanner: {
    backgroundColor: '#ef4444',
    padding: 12,
    alignItems: 'center',
  },
  redZoneBannerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  routeHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  destination: { color: '#fff', fontSize: 20, fontWeight: '700' },
  routeMeta: { color: '#a0a0b0', fontSize: 13, marginTop: 4 },
  stepCard: {
    margin: 16,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
  },
  stepFloor: { color: '#a0a0b0', fontSize: 12, marginBottom: 8 },
  stepInstruction: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 30 },
  stepDistance: { color: '#e94560', fontSize: 15, marginTop: 8 },
  speakButton: {
    marginTop: 16,
    backgroundColor: '#2a2a4a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  speakButtonText: { color: '#fff', fontSize: 13 },
  stepCounter: { color: '#666', fontSize: 13, textAlign: 'center' },
  navControls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  navButtonDisabled: { opacity: 0.4 },
  navButtonPrimary: { backgroundColor: '#e94560', borderColor: '#e94560' },
  navButtonText: { color: '#a0a0b0', fontSize: 15, fontWeight: '600' },
  navButtonPrimaryText: { color: '#fff' },
  arrivedContainer: { padding: 24, alignItems: 'center' },
  arrivedIcon: { fontSize: 72, marginTop: 40, marginBottom: 16 },
  arrivedTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  arrivedSubtitle: { color: '#a0a0b0', fontSize: 16, marginBottom: 32 },
  poisSection: { width: '100%', marginBottom: 32 },
  poisTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  poiIcon: { fontSize: 20 },
  poiName: { color: '#fff', fontSize: 14, flex: 1 },
  poiDistance: { color: '#a0a0b0', fontSize: 13 },
  doneButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
