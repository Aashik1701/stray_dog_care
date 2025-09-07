import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import apiService from '../../services/api';

// Reference to satisfy some linters that don't detect JSX tag usage of `motion.*`
void motion;

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar (variable width via motion variants inside component) */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

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
    </div>
  );
}
