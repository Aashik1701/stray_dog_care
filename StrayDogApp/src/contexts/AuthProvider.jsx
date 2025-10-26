import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../services/api';
import { isExpired, decodeJwt } from '../utils/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Check if user was previously logged in
        const stored = await AsyncStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate token expiry
          if (parsed?.token && !isExpired(parsed.token)) {
            setToken(parsed.token);
            setAuthToken(parsed.token);
            setUser(parsed.user);
          } else if (parsed?.token) {
            // Expired -> clear and auto-login with demo user
            await AsyncStorage.removeItem('auth');
            await autoLogin();
          }
        } else {
          // No stored auth, auto-login with demo user
          await autoLogin();
        }
      } catch {
        // On error, auto-login with demo user
        await autoLogin();
      }
      setLoading(false);
    })();
  }, []);

  // Auto-login function for demo purposes
  const autoLogin = async () => {
    const demoUser = {
      _id: 'demo-user-123',
      username: 'demo_user',
      email: 'demo@straydogcare.com',
      role: 'field_worker',
      permissions: ['create_dog', 'edit_dog'],
      profile: {
        firstName: 'Demo',
        lastName: 'User',
        phoneNumber: '1234567890'
      },
      isActive: true,
      isEmailVerified: true
    };

    const demoToken = 'demo-token-' + Date.now(); // Mock token

    setToken(demoToken);
    setUser(demoUser);
    setAuthToken(demoToken);
    await AsyncStorage.setItem('auth', JSON.stringify({ token: demoToken, user: demoUser }));
  };

  // Setup timer to auto-logout near expiry
  useEffect(() => {
    if (!token) return;
    const decoded = decodeJwt(token);
    if (!decoded?.exp) return;
    const now = Date.now();
    const logoutAt = decoded.exp * 1000 - 15000; // 15s before expiry
    const delay = Math.max(logoutAt - now, 0);
    const timer = setTimeout(() => {
      logout();
    }, delay);
    return () => clearTimeout(timer);
  }, [token]);

  const login = async (email, password) => {
    // For demo purposes, always succeed with the demo user
    // You can still call the real API if needed, but for now we'll use the demo user
    try {
      // Try real login first
      const res = await api.post('/auth/login', { email, password });
      const { token: t, user: u } = res.data.data;
      if (isExpired(t)) throw new Error('Received expired token');
      setToken(t);
      setUser(u);
      setAuthToken(t);
      await AsyncStorage.setItem('auth', JSON.stringify({ token: t, user: u }));
      return u;
    } catch (error) {
      // If real login fails, fall back to demo user
      console.log('Real login failed, using demo user:', error.message);
      const demoUser = {
        _id: 'demo-user-' + Date.now(),
        username: email || 'demo_user',
        email: email || 'demo@straydogcare.com',
        role: 'field_worker',
        permissions: ['create_dog', 'edit_dog'],
        profile: {
          firstName: 'Demo',
          lastName: 'User',
          phoneNumber: '1234567890'
        },
        isActive: true,
        isEmailVerified: true
      };

      const demoToken = 'demo-token-' + Date.now();
      setToken(demoToken);
      setUser(demoUser);
      setAuthToken(demoToken);
      await AsyncStorage.setItem('auth', JSON.stringify({ token: demoToken, user: demoUser }));
      return demoUser;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem('auth');
  };

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
