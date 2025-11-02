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
        // Restore session if possible
        const stored = await AsyncStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.token && !isExpired(parsed.token)) {
            setToken(parsed.token);
            setAuthToken(parsed.token);
            // Validate token by fetching profile
            try {
              const me = await api.get('/auth/me');
              setUser(me.data.data);
            } catch {
              // Token invalid on server, clear
              await AsyncStorage.removeItem('auth');
              setToken(null);
              setAuthToken(null);
              setUser(null);
            }
          } else if (parsed?.token) {
            // Expired -> clear
            await AsyncStorage.removeItem('auth');
          }
        }
      } catch {
        // Ignore and fall through to unauthenticated state
      }
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

  const register = async ({ username, email, password, firstName, lastName, phoneNumber, role, organizationId }) => {
    const res = await api.post('/auth/register', {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role,
      organizationId
    });
    const { token: t, user: u } = res.data.data;
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

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
