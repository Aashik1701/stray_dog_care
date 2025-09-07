import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon,
  XMarkIcon,
  HeartIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function TopBar({ stats }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const notifications = [
    {
      id: 1,
      title: 'New dog registered',
      message: 'Max needs immediate attention',
      time: '2 min ago',
      type: 'urgent'
    },
    {
      id: 2,
      title: 'Vaccination reminder',
      message: '5 dogs due for vaccination',
      time: '1 hour ago',
      type: 'info'
    }
  ];

  return (
    <motion.header 
      className="bg-white border-b border-gray-200 shadow-soft relative z-30"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Search Section */}
          <div className="flex-1 max-w-lg">
            <motion.div 
              className={`relative transition-all duration-200 ${
                searchFocused ? 'scale-105' : 'scale-100'
              }`}
              layout
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon 
                  className={`h-5 w-5 transition-colors duration-200 ${
                    searchFocused ? 'text-primary-500' : 'text-gray-400'
                  }`} 
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                placeholder="Search dogs, locations, or IDs..."
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 font-body text-sm transition-all duration-200 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  searchFocused 
                    ? 'border-primary-300 shadow-medium' 
                    : 'border-gray-300 shadow-soft hover:border-gray-400'
                }`}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Search dogs, locations, or IDs"
              />
            </motion.div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            {/* Quick Stats - Hidden on mobile, visible on tablet+ */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              {quickStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <motion.div 
                    className={`text-2xl lg:text-3xl font-bold font-heading ${stat.color} transition-colors duration-200`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </motion.div>
                  <div className="text-xs lg:text-sm font-medium text-gray-600 font-body">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Notifications */}
            <div className="relative">
              <motion.button
                className={`relative p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  showNotifications 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setShowNotifications(!showNotifications)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Notifications${notifications.length > 0 ? ` (${notifications.length} new)` : ''}`}
                aria-expanded={showNotifications}
              >
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {notifications.length > 0 && (
                  <motion.span 
                    className="absolute -top-0.5 -right-0.5 block h-4 w-4 rounded-full bg-danger-500 text-white text-xs font-bold flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {notifications.length}
                  </motion.span>
                )}
              </motion.button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-strong border border-gray-200 z-50"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold font-heading text-gray-900">
                          Notifications
                        </h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                          aria-label="Close notifications"
                        >
                          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                          <motion.div
                            key={notification.id}
                            className="p-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 p-2 rounded-lg ${
                                notification.type === 'urgent' 
                                  ? 'bg-danger-50 text-danger-600' 
                                  : 'bg-primary-50 text-primary-600'
                              }`}>
                                {notification.type === 'urgent' ? (
                                  <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <HeartIcon className="h-4 w-4" aria-hidden="true" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 font-heading">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 font-body">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 font-body">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                          <p className="text-gray-500 font-body">No new notifications</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Quick Stats */}
        <motion.div 
          className="md:hidden mt-4 grid grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {quickStats.map((stat, index) => (
            <motion.div
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
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.header>
  );
}
