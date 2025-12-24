import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  HeartIcon,
  MapIcon,
  ChartBarIcon,
  UsersIcon,
  CogIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const commands = [
  { id: 'dashboard', name: 'Dashboard', path: '/', icon: HomeIcon, keywords: ['home', 'overview'] },
  { id: 'dogs', name: 'Dogs Registry', path: '/dogs', icon: HeartIcon, keywords: ['dogs', 'pets', 'animals'] },
  { id: 'map', name: 'Map View', path: '/map', icon: MapIcon, keywords: ['map', 'location', 'gps'] },
  { id: 'analytics', name: 'Analytics', path: '/analytics', icon: ChartBarIcon, keywords: ['analytics', 'stats', 'reports'] },
  { id: 'users', name: 'Users', path: '/users', icon: UsersIcon, keywords: ['users', 'team', 'staff'] },
  { id: 'settings', name: 'Settings', path: '/settings', icon: CogIcon, keywords: ['settings', 'preferences', 'profile'] },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords.some(kw => kw.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        handleSelect(filteredCommands[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  const handleSelect = (command) => {
    navigate(command.path);
    onClose();
    setSearch('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm" />

        {/* Command Palette */}
        <motion.div
          className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No results found
              </div>
            ) : (
              <ul>
                {filteredCommands.map((command, index) => {
                  const Icon = command.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <li key={command.id}>
                      <button
                        onClick={() => handleSelect(command)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${
                          isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        <span className="text-sm font-medium">{command.name}</span>
                        {isSelected && (
                          <kbd className="ml-auto px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                            ↵
                          </kbd>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 font-mono bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">↑</kbd>
                <kbd className="px-2 py-1 font-mono bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 font-mono bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 font-mono bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
