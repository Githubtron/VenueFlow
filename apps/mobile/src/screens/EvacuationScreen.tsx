/**
 * Evacuation screen: full-screen red banner "EVACUATE NOW", cached exit routes, audio instructions.
 * Triggered by deep link or push notification. Works offline from cached exit routes.
 * Requirements: 5.2, 5.6, 29.2
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import * as Speech from 'expo-speech';
import { RouteProp } from '@react-navigation/native';
import { getEmergencyExit, EmergencyExitRow } from '../storage/db';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  route: RouteProp<RootStackParamList, 'Evacuation'>;
};

export default function EvacuationScreen({ route }: Props) {
  const { zoneId } = route.params;
  const [exitRoute, setExitRoute] = useState<EmergencyExitRow | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);

  useEffect(() => {
    loadExitRoute();
    return () => Speech.stop();
  }, [zoneId]);

  async function loadExitRoute() {
    const cached = await getEmergencyExit(zoneId);
    if (cached) {
      setExitRoute(cached);
      const parsed: string[] = JSON.parse(cached.instructions);
      setInstructions(parsed);
      // Speak first instruction
      if (parsed.length > 0) {
        Speech.speak('EVACUATE NOW. ' + parsed[0], { language: 'en', rate: 0.85, pitch: 1.1 });
      }
    } else {
      // Fallback: generic evacuation instruction
      const fallback = ['Move calmly to the nearest exit. Follow staff instructions.'];
      setInstructions(fallback);
      Speech.speak('EVACUATE NOW. ' + fallback[0], { language: 'en', rate: 0.85 });
    }
  }

  return (
    <>
      <StatusBar backgroundColor="#ef4444" barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🚨 EVACUATE NOW 🚨</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.zoneLabel}>Zone: {zoneId}</Text>

          {exitRoute && (
            <Text style={styles.eta}>
              Estimated evacuation time: ~{exitRoute.estimated_minutes} min
            </Text>
          )}

          <Text style={styles.instructionsTitle}>Exit instructions</Text>

          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}

          <View style={styles.offlineNote}>
            <Text style={styles.offlineNoteText}>
              ✓ These instructions are available offline
            </Text>
          </View>

          <View style={styles.callout}>
            <Text style={styles.calloutText}>
              Stay calm. Follow staff directions. Do not use elevators.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },
  banner: {
    backgroundColor: '#ef4444',
    paddingVertical: 20,
    alignItems: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scroll: { padding: 20, paddingBottom: 40 },
  zoneLabel: { color: '#fff', fontSize: 16, marginBottom: 4 },
  eta: { color: '#f59e0b', fontSize: 15, marginBottom: 20 },
  instructionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  instructionText: { color: '#fff', fontSize: 16, flex: 1, lineHeight: 22 },
  offlineNote: {
    backgroundColor: '#2a0000',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  offlineNoteText: { color: '#22c55e', fontSize: 13 },
  callout: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 16,
  },
  calloutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
