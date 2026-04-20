/**
 * Persistent SOS FAB button shown on all screens.
 * Taps open SOS confirmation with 3-second cancel window.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

export function SOSFab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate('SOS')}
      accessibilityRole="button"
      accessibilityLabel="SOS emergency button"
      accessibilityHint="Opens emergency SOS with a 3-second cancel window"
    >
      <Text style={styles.fabText}>SOS</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
