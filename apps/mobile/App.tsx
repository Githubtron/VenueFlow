/**
 * VenueFlow Mobile App — root entry point.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initDeepLinkListener } from './src/navigation/DeepLinkHandler';
import { getDb } from './src/storage/db';

export default function App() {
  useEffect(() => {
    // Initialize SQLite schema on startup
    getDb().catch(console.error);

    // Initialize deep link listener
    const cleanup = initDeepLinkListener();
    return cleanup;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
