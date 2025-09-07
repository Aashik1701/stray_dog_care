import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSidebar } from './DashboardLayout';
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

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isCollapsed, toggleSidebar } = useSidebar();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={closeMobileMenu}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-white shadow-xl transform ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center">
            <HeartIcon className="h-8 w-8 text-primary-600 flex-shrink-0" />
            {!isCollapsed && (
              <span className="ml-2 text-xl font-bold text-gray-900 transition-opacity duration-200">
                DogCare
              </span>
            )}
          </div>
          
          {/* Desktop toggle button */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            onClick={closeMobileMenu}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul role="list" className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    } ${isCollapsed ? 'justify-center' : ''}`
                  }
                  title={isCollapsed ? item.name : ''}
                >
                  <item.icon
                    className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`}
                    aria-hidden="true"
                  />
                  {!isCollapsed && (
                    <span className="transition-opacity duration-200">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">TU</span>
            </div>
            {!isCollapsed && (
              <div className="ml-3 transition-opacity duration-200">
                <p className="text-sm font-medium text-gray-700">Test User</p>
                <p className="text-xs text-gray-500">Field Worker</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-40 lg:hidden p-2 rounded-md bg-white shadow-md border border-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span className="sr-only">Open sidebar</span>
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
