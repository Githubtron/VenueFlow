/**
 * Login screen: email + password; store tokens on success; show inline error on 401.
 * Requirements: 6.5, 9.5
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { setTokens, setUserInfo } from '../storage/mmkv';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
  route: RouteProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation, route }: Props) {
  const sessionExpiredMessage = route.params?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(sessionExpiredMessage ?? null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        userId: string;
        email: string;
        role: string;
      }>('/auth/login', { email, password });

      setTokens(res.data.accessToken, res.data.refreshToken);
      setUserInfo(res.data.userId, res.data.email, res.data.role);
      navigation.replace('Main');
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Sign in</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#666"
              secureTextEntry
              accessibilityLabel="Password"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Don't have an account? Create one</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 24 },
  errorBanner: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: '#fff', fontSize: 14 },
  field: { marginBottom: 16 },
  label: { color: '#a0a0b0', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  inputError: { borderColor: '#e94560' },
  primaryButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkButton: { paddingVertical: 16, alignItems: 'center' },
  linkText: { color: '#a0a0b0', fontSize: 14 },
});
