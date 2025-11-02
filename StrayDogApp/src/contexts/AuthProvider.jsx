import React, { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../services/api';
import { isExpired, decodeJwt } from '../utils/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoggedInRef = useRef(false); // Track if we've just logged in

  // Define logout early to avoid Temporal Dead Zone issues in effects below
  const logout = useCallback(async () => {
    console.log('🚪 Logout called', new Error().stack.split('\n').slice(1, 4).join('\n'));
    hasLoggedInRef.current = false; // Reset login flag on logout
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem('auth');
  }, []);

  useEffect(() => {
    let mounted = true; // Flag to prevent state updates after unmount
    
    (async () => {
      try {
        // Skip session restoration if we just logged in
        if (hasLoggedInRef.current) {
          console.log('⏭️ Skipping session restoration - user just logged in');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

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
              if (mounted && me?.data?.data) {
                console.log('🔄 Restored session for user:', me.data.data.email || me.data.data.username);
                // Only set user if we don't already have one (to avoid race conditions)
                setUser(prevUser => {
                  if (!prevUser) {
                    return me.data.data;
                  }
                  console.log('⚠️ User already exists, keeping existing user');
                  return prevUser;
                });
              }
            } catch (error) {
              console.log('❌ Session validation failed:', error.message);
              // NEVER clear if we just logged in or if we have an active user
              if (mounted) {
                // If we just logged in, skip clearing entirely
                if (hasLoggedInRef.current) {
                  console.log('⚠️ Just logged in - skipping session validation error');
                  return;
                }
                
                setUser(prevUser => {
                  if (prevUser) {
                    console.log('⚠️ Keeping existing user despite validation error');
                    return prevUser; // Keep existing user
                  }
                  // No active user and didn't just log in, safe to clear everything
                  console.log('🗑️ Clearing invalid session (no active user and not just logged in)');
                  AsyncStorage.removeItem('auth').catch(() => {});
                  setToken(null);
                  setAuthToken(null);
                  return null;
                });
              }
            }
          } else if (parsed?.token) {
            // Expired -> clear
            await AsyncStorage.removeItem('auth');
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        // Ignore and fall through to unauthenticated state
      }
      if (mounted) {
        setLoading(false);
      }
    })();
    
    return () => {
      mounted = false; // Prevent state updates after unmount
    };
  }, []);

  // Setup timer to auto-logout near expiry with safe scheduling for long delays
  useEffect(() => {
    if (!token) return;
    const decoded = decodeJwt(token);
    if (!decoded?.exp) return;

    const LOGOUT_MARGIN_MS = 15000; // 15s before expiry
    const MAX_TIMEOUT_MS = 2147483647; // ~24.85 days (setTimeout max)
    let timerId = null;

    const schedule = () => {
      const now = Date.now();
      const expiryTime = decoded.exp * 1000;
      const logoutAt = expiryTime - LOGOUT_MARGIN_MS;
      const remaining = logoutAt - now;

      if (remaining <= 0) {
        console.log('⏰ Auto-logout: token expired or within margin');
        logout();
        return;
      }

      // If remaining is larger than max timeout, schedule a chunk and reschedule on fire
      const delay = Math.min(remaining, MAX_TIMEOUT_MS - 1000); // keep a small buffer
      console.log('⏰ Scheduling auto-logout check in', Math.round(delay / 1000), 'seconds (remaining:', Math.round(remaining / 1000), 'seconds)');
      timerId = setTimeout(() => {
        // Recompute and either schedule the next chunk or perform logout if within margin
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      if (timerId) {
        console.log('⏰ Clearing auto-logout timer');
        clearTimeout(timerId);
      }
    };
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      console.log('🔐 Login response received:', { success: res.data.success, hasUser: !!res.data.data?.user, hasToken: !!res.data.data?.token });
      
      if (!res.data?.data?.user || !res.data?.data?.token) {
        throw new Error('Invalid login response: missing user or token');
      }
      
      const { token: t, user: u } = res.data.data;
      
      if (!t || !u) {
        throw new Error('Invalid login response: token or user is empty');
      }
      
      if (isExpired(t)) {
        throw new Error('Received expired token');
      }
      
      console.log('✅ Setting user and token:', { userId: u?._id, email: u?.email, tokenLength: t?.length });
      
      // Mark that we've just logged in to prevent session restoration from interfering
      hasLoggedInRef.current = true;
      
      // Persist to storage FIRST to ensure it's saved before state changes
      await AsyncStorage.setItem('auth', JSON.stringify({ token: t, user: u }));
      console.log('💾 Auth data saved to AsyncStorage');
      
      // Update state atomically - set token first so axios interceptor has it
      // Use React.startTransition or ensure synchronous updates
      setAuthToken(t);
      setToken(t);
      setUser(u);
      
      // Verify state was set correctly
      console.log('✅ Auth state updated, should navigate to main app');
      
      // Reset the flag after a longer delay to ensure navigation completes
      setTimeout(() => {
        hasLoggedInRef.current = false;
        console.log('🔄 Login flag reset, session restoration enabled again');
      }, 5000);
      
      return u;
    } catch (error) {
      // Handle network errors
      if (!error.response) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        }
        if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
          throw new Error('Cannot connect to server. Make sure the backend is running and check your API URL configuration.');
        }
        if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
          throw new Error('No internet connection. Please check your network settings.');
        }
        throw new Error(error.message || 'Network error. Please try again.');
      }
      // Handle API errors
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async ({ username, email, password, firstName, lastName, phoneNumber, role, organizationId }) => {
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
  }, []);

  // Debug: Log when user state changes and track what's clearing it
  useEffect(() => {
    if (!user && token) {
      console.error('⚠️ WARNING: User cleared but token still exists!', {
        tokenLength: token?.length,
        stackTrace: new Error().stack.split('\n').slice(1, 6).join('\n')
      });
    }
    if (user && !token) {
      console.error('⚠️ WARNING: Token cleared but user still exists!', {
        userId: user?._id,
        stackTrace: new Error().stack.split('\n').slice(1, 6).join('\n')
      });
    }
    console.log('👤 User state changed:', { 
      hasUser: !!user, 
      userId: user?._id, 
      email: user?.email,
      tokenSet: !!token,
      hasLoggedInFlag: hasLoggedInRef.current
    });
  }, [user, token]);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
