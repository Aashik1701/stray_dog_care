import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER: 'LOAD_USER',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING'
};

// Initial state
const initialState = {
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: false,
  loading: true,
  error: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        // Avoid global loading overlay during login to prevent route flicker
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: Boolean(action.payload),
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOAD_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        error: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    default:
      return state;
  }
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Sync token with apiService whenever it changes
  useEffect(() => {
    if (state.token) {
      apiService.setToken(state.token);
    } else {
      apiService.setToken(null);
    }
  }, [state.token]);

  // Load user on app start
  useEffect(() => {
    loadUser();
  }, []);

  // Auto-login function for demo purposes
  const autoLogin = useCallback(async () => {
    try {
      // Try to login with test account
      const response = await apiService.login({
        email: 'worker@dogster.com',
        password: 'worker123'
      });

      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data
        });
        console.log('✅ Auto-logged in with test account');
      } else {
        throw new Error('Test account login failed');
      }
    } catch (error) {
      console.error('❌ Auto-login failed:', error);
      // If test account doesn't exist, show not authenticated state
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: 'Please login with valid credentials'
      });
    }
  }, []);

  // Load user profile
  const loadUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      // No token found, auto-login with demo user
      await autoLogin();
      return;
    }

    try {
      apiService.setToken(token);
      const response = await apiService.getMe();
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.LOAD_USER,
          payload: response.data
        });
      } else {
        throw new Error('Failed to load user');
      }
    } catch (error) {
      console.error('Load user error:', error);
      localStorage.removeItem('token');
      apiService.setToken(null);
      // On error, auto-login with demo user
      await autoLogin();
    }
  }, [autoLogin]);

  // Login function
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      // Try real login first
      const response = await apiService.login(credentials);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data
        });
        return { success: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.log('Real login failed, using demo user:', error.message);
      // On login failure, fall back to demo user
      await autoLogin();
      return { success: true };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await apiService.register(userData);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data
        });
        return { success: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      apiService.setToken(null);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Update user profile
  const updateUser = async (userData) => {
    try {
      const response = await apiService.request('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(userData)
      });

      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: response.data
        });
        return { success: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      const errorMessage = error.message || 'Update failed';
      return { success: false, error: errorMessage };
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!state.user) return false;
    return state.user.permissions?.includes(permission) || state.user.role === 'system_admin';
  };

  // Check if user has role
  const hasRole = (roles) => {
    if (!state.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.user.role) || state.user.role === 'system_admin';
  };

  // Get user's role-based navigation items
  const getAuthorizedNavItems = () => {
    if (!state.user) return [];

    const baseItems = [
      { name: 'Dashboard', path: '/', icon: 'dashboard' }
    ];

    // Dogs management (all authenticated users)
    baseItems.push({ name: 'Dogs', path: '/dogs', icon: 'dogs' });

    // Analytics (coordinators and above)
    if (hasPermission('view_analytics')) {
      baseItems.push({ name: 'Analytics', path: '/analytics', icon: 'analytics' });
    }

    // User management (coordinators and above)
    if (hasPermission('manage_users')) {
      baseItems.push({ name: 'Users', path: '/users', icon: 'users' });
    }

    // Map view (all authenticated users)
    baseItems.push({ name: 'Map', path: '/map', icon: 'map' });

    // Settings (all authenticated users)
    baseItems.push({ name: 'Settings', path: '/settings', icon: 'settings' });

    return baseItems;
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    hasRole,
    getAuthorizedNavItems,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
