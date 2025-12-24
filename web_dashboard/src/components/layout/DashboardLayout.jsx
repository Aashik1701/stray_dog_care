import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../ui/CommandPalette';
import apiService from '../../services/api';

// Reference to satisfy some linters that don't detect JSX tag usage of `motion.*`
void motion;

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiService.getDogsStatistics();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar (variable width via motion variants inside component) */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} stats={stats} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar stats={stats} />

        <motion.main
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </div>
  );
}
