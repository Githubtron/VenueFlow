import React, { useState, useCallback, useEffect } from 'react';
import { AuthContext, AuthUser } from './useAuth';

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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? 'Login failed');
    }

    const data = (await res.json()) as {
      accessToken: string;
      user: { userId: string; email: string; role: string; venueId: string };
    };

    const authUser: AuthUser = {
      userId: data.user.userId,
      email: data.user.email,
      role: data.user.role as AuthUser['role'],
      venueId: data.user.venueId ?? '',
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
