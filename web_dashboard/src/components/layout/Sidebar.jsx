import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  UsersIcon, 
  MapIcon,
  ChartBarIcon,
  CogIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Dogs', href: '/dogs', icon: HeartIcon },
  { name: 'Map View', href: '/map', icon: MapIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const sidebarVariants = {
    expanded: { width: 256 },
    collapsed: { width: 64 }
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 }
  };

  return (
    <>
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
          >
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-strong border-r border-gray-200 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-medium"
              whileHover={{ 
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.3)",
                scale: 1.05 
              }}
              transition={{ duration: 0.2 }}
            >
              <HeartIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span 
                  className="ml-3 text-xl font-bold font-heading text-gray-900"
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2 }}
                >
                  DogCare
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Desktop toggle button */}
          <motion.button
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </motion.div>
          </motion.button>

          {/* Mobile close button */}
          <motion.button
            onClick={closeMobileMenu}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4" role="navigation" aria-label="Main navigation">
          <ul role="list" className="space-y-2">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              
              return (
                <motion.li 
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <NavLink
                    to={item.href}
                    className={`group relative flex items-center px-3 py-3 text-sm font-medium font-body rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 shadow-soft'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.name : ''}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"
                        layoutId="activeIndicator"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <motion.div
                      className={`flex items-center ${isCollapsed ? '' : 'mr-3'}`}
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.1 }}
                    >
                      <item.icon
                        className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                          isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
                        }`}
                        aria-hidden="true"
                      />
                    </motion.div>
                    
                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          variants={contentVariants}
                          initial="collapsed"
                          animate="expanded"
                          exit="collapsed"
                          transition={{ duration: 0.2 }}
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <motion.div
                        className="absolute left-16 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -10, opacity: 0 }}
                      >
                        {item.name}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </motion.div>
                    )}
                  </NavLink>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <motion.div 
          className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-gray-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <motion.div 
            className={`flex items-center transition-all duration-200 hover:bg-white rounded-xl p-2 cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-medium"
              whileHover={{ 
                boxShadow: "0 8px 25px -5px rgba(59, 130, 246, 0.3)",
                scale: 1.05 
              }}
            >
              <span className="text-white text-sm font-bold font-heading">TU</span>
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div 
                  className="ml-3"
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm font-medium font-heading text-gray-900">Test User</p>
                  <p className="text-xs text-gray-500 font-body">Field Worker</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Mobile menu button */}
      <motion.button
        type="button"
        className="fixed top-4 left-4 z-40 lg:hidden p-3 rounded-xl bg-white shadow-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open sidebar"
      >
        <AnimatePresence mode="wait">
          {isMobileMenuOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
