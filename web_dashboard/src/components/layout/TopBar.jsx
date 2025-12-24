import React, { useEffect, useState, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon,
  XMarkIcon,
  HeartIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../ui/ThemeToggle';

export default function TopBar({ stats }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, token } = useAuth();
  const notificationsRef = useRef([]);

  const quickStats = [
    {
      label: 'Dogs Today',
      value: stats?.todayRegistrations || 0,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50'
    },
    {
      label: 'Vaccinated',
      value: stats?.vaccinated || 0,
      color: 'text-success-600',
      bgColor: 'bg-success-50'
    },
    {
      label: 'Sterilized',
      value: stats?.sterilized || 0,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50'
    }
  ];

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Add notification
  const addNotification = (alert) => {
    const notification = {
      id: alert.alertId || `alert-${Date.now()}`,
      title: alert.title || 'New Alert',
      message: alert.message || alert.nlpAnalysis?.summary || 'No details available',
      time: formatTimeAgo(alert.createdAt || new Date()),
      type: alert.priority === 'critical' || alert.urgencyScore >= 0.85 ? 'critical' : 
            alert.priority === 'high' || alert.urgencyScore >= 0.7 ? 'urgent' : 'info',
      alert: alert,
      createdAt: alert.createdAt || new Date()
    };
    
    notificationsRef.current = [notification, ...notificationsRef.current].slice(0, 50); // Keep last 50
    setNotifications([...notificationsRef.current]);
    
    // Browser notification for critical alerts
    if (notification.type === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: notification.id,
        requireInteraction: true
      });
    }
  };

  const [nlpStatus, setNlpStatus] = useState({ enabled: null });
  
  // Socket.io connection for real-time alerts
  useEffect(() => {
    if (!token || !user) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Connect to Socket.io
    const organizationId = user.organization?._id || user.organization;
    const zones = user.assignedZones || [];
    
    socketService.connect(token, organizationId, zones);

    // Subscribe to alert events
    const unsubscribeAlertNew = socketService.on('alert.new', (alert) => {
      addNotification(alert);
    });

    const unsubscribeAlertCritical = socketService.on('alert.critical', (alert) => {
      addNotification(alert);
    });

    const unsubscribeAlertHigh = socketService.on('alert.high_priority', (alert) => {
      addNotification(alert);
    });

    const unsubscribeAlertZone = socketService.on('alert.zone', (alert) => {
      addNotification(alert);
    });

    // Cleanup
    return () => {
      unsubscribeAlertNew();
      unsubscribeAlertCritical();
      unsubscribeAlertHigh();
      unsubscribeAlertZone();
      socketService.disconnect();
    };
  }, [token, user]);

  // Fetch NLP status
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await api.getNLPStatus();
        if (mounted && res?.success) setNlpStatus(res.data);
      } catch {
        if (mounted) setNlpStatus({ enabled: null });
      }
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 30000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const renderNLPBadge = () => {
    const { enabled, circuitOpen, serviceHealthy } = nlpStatus || {};
    const isUnknown = enabled === null || typeof enabled === 'undefined';
    const degraded = enabled && (circuitOpen || serviceHealthy === false);
    const color = isUnknown
      ? 'bg-gray-100 text-gray-700'
      : !enabled
      ? 'bg-gray-200 text-gray-600'
      : degraded
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-green-100 text-green-800';
    const dot = isUnknown
      ? 'bg-gray-400'
      : !enabled
      ? 'bg-gray-400'
      : degraded
      ? 'bg-yellow-500'
      : 'bg-green-500';
    const label = isUnknown
      ? 'NLP Checking…'
      : !enabled
      ? 'NLP Off'
      : degraded
      ? 'NLP Degraded'
      : 'NLP Ready';
    return (
      <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${color}`} title="NLP client status">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true"></span>
        <span>{label}</span>
      </div>
    );
  };

  return (
    <Motion.header 
      className="relative z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-soft"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Search Section */}
          <div className="flex-1 max-w-lg">
            <Motion.div 
              className={`relative transition-all duration-200 ${
                searchFocused ? 'scale-105' : 'scale-100'
              }`}
              layout
            >
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon 
                  className={`h-5 w-5 transition-colors duration-200 ${
                    searchFocused ? 'text-primary-500' : 'text-gray-400'
                  }`} 
                  aria-hidden="true"
                />
              </div>
              <label htmlFor="topbar-search" className="sr-only">Search</label>
              <input
                id="topbar-search"
                name="topbarSearch"
                type="text"
                placeholder="Search dogs, locations, or IDs... (⌘K)"
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 dark:text-gray-100 font-body text-sm transition-all duration-200 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  searchFocused 
                    ? 'border-primary-300 dark:border-primary-700 shadow-medium' 
                    : 'border-gray-300 dark:border-gray-700 shadow-soft hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                readOnly
                onClick={(e) => {
                  e.target.blur();
                  // Dispatch custom event to open command palette
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                }}
                aria-label="Search dogs, locations, or IDs"
              />
            </Motion.div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            {renderNLPBadge()}
            <ThemeToggle />
            {/* Quick Stats - Hidden on mobile, visible on tablet+ */}
            <div className="items-center hidden space-x-4 md:flex lg:space-x-6">
              {quickStats.map((stat, index) => (
                <Motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <Motion.div 
                    className={`text-2xl lg:text-3xl font-bold font-heading ${stat.color} transition-colors duration-200`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </Motion.div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 lg:text-sm font-body">
                    {stat.label}
                  </div>
                </Motion.div>
              ))}
            </div>

            {/* Notifications */}
            <div className="relative">
              <Motion.button
                className={`relative p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  showNotifications 
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setShowNotifications(!showNotifications)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Notifications${notifications.length > 0 ? ` (${notifications.length} new)` : ''}`}
                aria-expanded={showNotifications}
              >
                <BellIcon className="w-6 h-6" aria-hidden="true" />
                {notifications.length > 0 && (
                  <Motion.span 
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 rounded-full bg-danger-500 text-white text-xs font-bold items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {notifications.length}
                  </Motion.span>
                )}
              </Motion.button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <Motion.div
                    className="absolute right-0 z-50 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-80 rounded-xl shadow-strong"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-heading">
                          Notifications
                        </h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 text-gray-400 transition-colors duration-200 rounded-lg hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label="Close notifications"
                        >
                          <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-y-auto max-h-96">
                      {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                          <Motion.div
                            key={notification.id}
                            className="p-4 transition-colors duration-200 border-b cursor-pointer border-gray-50 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 p-2 rounded-lg ${
                                notification.type === 'critical' 
                                  ? 'bg-red-100 text-red-600' 
                                  : notification.type === 'urgent'
                                  ? 'bg-danger-50 text-danger-600' 
                                  : 'bg-primary-50 text-primary-600'
                              }`}>
                                {notification.type === 'critical' || notification.type === 'urgent' ? (
                                  <ExclamationTriangleIcon className="w-4 h-4" aria-hidden="true" />
                                ) : (
                                  <HeartIcon className="w-4 h-4" aria-hidden="true" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-heading">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-body">
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-400 font-body">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </Motion.div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <BellIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" aria-hidden="true" />
                          <p className="text-gray-500 font-body">No new notifications</p>
                        </div>
                      )}
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Quick Stats */}
  <Motion.div 
          className="grid grid-cols-3 gap-4 mt-4 md:hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {quickStats.map((stat, index) => (
            <Motion.div
              key={stat.label}
              className={`text-center p-3 rounded-xl ${stat.bgColor} transition-all duration-200 hover:scale-105`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <div className={`text-xl font-bold font-heading ${stat.color}`}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
              <div className="text-xs font-medium text-gray-600 font-body">
                {stat.label}
              </div>
            </Motion.div>
          ))}
  </Motion.div>
      </div>
  </Motion.header>
  );
}
