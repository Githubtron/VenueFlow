/**
 * Root navigator with all screens and deep link configuration.
 */
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import TicketLinkScreen from '../screens/TicketLinkScreen';
import LocationConsentScreen from '../screens/LocationConsentScreen';
import HeatmapScreen from '../screens/HeatmapScreen';
import TicketScreen from '../screens/TicketScreen';
import NavigationScreen from '../screens/NavigationScreen';
import SOSScreen from '../screens/SOSScreen';
import MedicalSOSScreen from '../screens/MedicalSOSScreen';
import EvacuationScreen from '../screens/EvacuationScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import RewardsScreen from '../screens/RewardsScreen';
import RewardDetailScreen from '../screens/RewardDetailScreen';
import TransportScreen from '../screens/TransportScreen';
import KioskListScreen from '../screens/KioskListScreen';
import KioskDetailScreen from '../screens/KioskDetailScreen';
import OrderFormScreen from '../screens/OrderFormScreen';
import OrderStatusScreen from '../screens/OrderStatusScreen';

import { setSessionExpiredHandler } from '../api/client';
import { getAccessToken } from '../storage/mmkv';
import { startConnectivityMonitoring } from '../sync/connectivityManager';
import { handleDeepLink } from './DeepLinkHandler';

// ─── Type definitions ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome: undefined;
  Register: undefined;
  Login: { message?: string } | undefined;
  LocationConsent: undefined;
  TicketLink: undefined;
  Main: undefined;
  Navigation: { destination: string; destinationType: string };
  SOS: undefined;
  MedicalSOS: undefined;
  Evacuation: { zoneId: string };
  IncidentReport: undefined;
  RewardDetail: { rewardId: string };
  KioskList: undefined;
  KioskDetail: { kioskId: string };
  OrderForm: { kioskId: string };
  OrderStatus: { orderId: string };
};

export type MainTabParamList = {
  Heatmap: undefined;
  Ticket: undefined;
  Rewards: undefined;
  Transport: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const DEEP_LINK_CONFIG = {
  prefixes: ['venueflow://'],
  config: {
    screens: {
      Main: {
        screens: {
          Heatmap: 'event/:eventId',
        },
      },
      Navigation: 'entry/:eventId',
      Evacuation: 'emergency/evacuate/:zoneId',
    },
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#2a2a4a' },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Heatmap"
        component={HeatmapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="Ticket"
        component={TicketScreen}
        options={{
          tabBarLabel: 'Ticket',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎫</Text>,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          tabBarLabel: 'Rewards',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⭐</Text>,
        }}
      />
      <Tab.Screen
        name="Transport"
        component={TransportScreen}
        options={{
          tabBarLabel: 'Transport',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🚌</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isLoggedIn = !!getAccessToken();

  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    startConnectivityMonitoring();
    setSessionExpiredHandler(() => {
      navigationRef.current?.navigate('Login', { message: 'Session expired' });
    });
  }, []);

  return (
    <NavigationContainer linking={DEEP_LINK_CONFIG} ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Main' : 'Welcome'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="LocationConsent" component={LocationConsentScreen} />
        <Stack.Screen name="TicketLink" component={TicketLinkScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Navigation"
          component={NavigationScreen}
          options={{ headerShown: true, title: 'Navigation', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="SOS"
          component={SOSScreen}
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="MedicalSOS"
          component={MedicalSOSScreen}
          options={{ presentation: 'modal', headerShown: true, title: 'Medical Emergency', headerStyle: { backgroundColor: '#1a0000' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="Evacuation"
          component={EvacuationScreen}
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="IncidentReport"
          component={IncidentReportScreen}
          options={{ presentation: 'modal', headerShown: true, title: 'Report Incident', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="RewardDetail"
          component={RewardDetailScreen}
          options={{ headerShown: true, title: 'Reward', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="KioskList"
          component={KioskListScreen}
          options={{ headerShown: true, title: 'Order from Seat', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="KioskDetail"
          component={KioskDetailScreen}
          options={{ headerShown: true, title: 'Kiosk', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="OrderForm"
          component={OrderFormScreen}
          options={{ headerShown: true, title: 'New Order', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="OrderStatus"
          component={OrderStatusScreen}
          options={{ headerShown: true, title: 'Order Status', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff', gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
