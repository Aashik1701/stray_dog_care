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
        const stored = await AsyncStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate token expiry
          if (parsed?.token && !isExpired(parsed.token)) {
            setToken(parsed.token);
            setAuthToken(parsed.token);
            setUser(parsed.user);
          } else if (parsed?.token) {
            // Expired -> clear
            await AsyncStorage.removeItem('auth');
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

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
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data.data;
    if (isExpired(t)) throw new Error('Received expired token');
    setToken(t);
    setUser(u);
    setAuthToken(t);
    await AsyncStorage.setItem('auth', JSON.stringify({ token: t, user: u }));
    return u;
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
