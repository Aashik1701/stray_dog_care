import { io } from 'socket.io-client';
import Constants from 'expo-constants';

/**
 * Socket.io Service for Real-Time Alerts
 * 
 * Implements dynamic alerting pipeline integration for mobile app.
 * Connects to backend Socket.io server to receive real-time alerts
 * auto-flagged by NLP sentiment and urgency analysis.
 */

function resolveBaseURL() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  try {
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;
    if (apiUrl) {
      return apiUrl.replace(/\/$/, '');
    }
  } catch {}
  return 'http://localhost:3000';
}

const API_BASE_URL = resolveBaseURL();

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token, organizationId, zones = []) {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    this.disconnect();

    console.log('[Socket] Connecting to:', API_BASE_URL);

    this.socket = io(API_BASE_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Join organization room
      if (organizationId) {
        this.socket.emit('join-organization', organizationId);
        console.log('[Socket] Joined organization:', organizationId);
      }

      // Join zone rooms
      zones.forEach(zone => {
        if (zone) {
          this.socket.emit('join-zone', zone);
          console.log('[Socket] Joined zone:', zone);
        }
      });

      // Notify listeners
      this.emitToListeners('connect', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      this.emitToListeners('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.reconnectAttempts++;
      this.emitToListeners('error', { error });
    });

    // Alert events - Dynamic Alerting Pipeline
    this.socket.on('alert.new', (alert) => {
      console.log('[Socket] New alert received:', alert.alertId);
      this.emitToListeners('alert.new', alert);
    });

    this.socket.on('alert.critical', (alert) => {
      console.log('[Socket] CRITICAL alert received:', alert.alertId);
      this.emitToListeners('alert.critical', alert);
    });

    this.socket.on('alert.high_priority', (alert) => {
      console.log('[Socket] High priority alert received:', alert.alertId);
      this.emitToListeners('alert.high_priority', alert);
    });

    this.socket.on('alert.zone', (alert) => {
      console.log('[Socket] Zone alert received:', alert.alertId);
      this.emitToListeners('alert.zone', alert);
    });

    this.socket.on('alert.acknowledged', (data) => {
      console.log('[Socket] Alert acknowledged:', data.alertId);
      this.emitToListeners('alert.acknowledged', data);
    });

    this.socket.on('alert.assigned', (data) => {
      console.log('[Socket] Alert assigned:', data.alertId);
      this.emitToListeners('alert.assigned', data);
    });

    this.socket.on('alert.resolved', (data) => {
      console.log('[Socket] Alert resolved:', data.alertId);
      this.emitToListeners('alert.resolved', data);
    });

    this.socket.on('alert.escalated', (data) => {
      console.log('[Socket] Alert escalated:', data.alertId);
      this.emitToListeners('alert.escalated', data);
    });

    // Legacy dog events (for backward compatibility)
    this.socket.on('dog-registered', (data) => {
      console.log('[Socket] Dog registered:', data);
      this.emitToListeners('dog-registered', data);
    });

    this.socket.on('dog-status-changed', (data) => {
      console.log('[Socket] Dog status changed:', data);
      this.emitToListeners('dog-status-changed', data);
    });

    this.socket.on('dog.highUrgency', (data) => {
      console.log('[Socket] High urgency dog:', data);
      this.emitToListeners('dog.highUrgency', data);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit to all listeners for an event
  emitToListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // Emit to server
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit: not connected');
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default new SocketService();

