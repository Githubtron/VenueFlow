import React, { useState, useCallback, useEffect } from 'react';
import { AuthContext, AuthUser } from './useAuth';
import { buildApiUrl } from '../utils/api';

const TOKEN_KEY = 'vf_dashboard_token';
const USER_KEY = 'vf_dashboard_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email: string, password: string) => {
    // Step 1: login to get tokens
    const res = await fetch(buildApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string; message?: string };
      throw new Error(err.error ?? err.message ?? 'Login failed');
    }

    const data = await res.json() as { accessToken: string; refreshToken: string };

    // Step 2: fetch user profile using the access token
    const meRes = await fetch(buildApiUrl('/auth/me'), {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });

    if (!meRes.ok) throw new Error('Failed to fetch user profile');

    const me = await meRes.json() as {
      userId: string;
      email: string;
      role: string;
      venueId?: string;
    };

    const authUser: AuthUser = {
      userId: me.userId,
      email: me.email,
      role: me.role as AuthUser['role'],
      venueId: me.venueId ?? 'venue-1',
      token: data.accessToken,
    };

    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Sync token into axios default headers via a custom event
  useEffect(() => {
    if (user?.token) {
      document.dispatchEvent(
        new CustomEvent('vf:token', { detail: user.token })
      );
    }
  }, [user?.token]);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: user !== null }}
    >
      {children}
    </AuthContext.Provider>
  );
}
