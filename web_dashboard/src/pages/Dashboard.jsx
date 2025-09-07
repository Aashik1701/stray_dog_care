import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MetricCard from '../components/ui/MetricCard';
import RecentRegistrations from '../components/dashboard/RecentRegistrations';
import QuickActions from '../components/dashboard/QuickActions';
import { LoadingCard } from '../components/ui/Loading';
import apiService from '../services/api';
import { 
  UsersIcon, 
  HeartIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 12,
    sterilized: 8,
    vaccinated: 10,
    injured: 2,
    sick: 1
  });
  const [dogs, setDogs] = useState([
    {
      _id: '1',
      name: 'Buddy',
      breed: 'Golden Retriever',
      healthStatus: 'healthy',
      isVaccinated: true,
      isSterilized: true,
      location: 'Central Park',
      createdAt: new Date().toISOString(),
      photos: []
    },
    {
      _id: '2',
      name: 'Luna',
      breed: 'Street Dog',
      healthStatus: 'injured',
      isVaccinated: false,
      isSterilized: false,
      location: 'Downtown',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      photos: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('Dashboard component rendering...', { stats, dogs, loading, error });

  useEffect(() => {
    console.log('Dashboard useEffect running...');
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dogs and statistics
      const [dogsResponse, statsResponse] = await Promise.all([
        apiService.getDogs({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
        apiService.getDogsStatistics()
      ]);

      console.log('Dogs response:', dogsResponse);
      console.log('Stats response:', statsResponse);

      if (dogsResponse.success) {
        setDogs(dogsResponse.data.dogs || []);
      } else {
        console.warn('Dogs API returned no success flag');
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      } else {
        console.warn('Stats API returned no success flag');
        // Set some default stats if API fails
        setStats({
          total: 0,
          sterilized: 0,
          vaccinated: 0,
          injured: 0,
          sick: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
      
      // Keep mock data for development if API fails
      console.log('Using mock data due to API error');
    } finally {
      setLoading(false);
    }
  };

  const handleDogClick = (dog) => {
    console.log('Dog clicked:', dog);
    // Navigate to dog details page when implemented
  };

  const handleActionClick = (action) => {
    console.log('Action clicked:', action);
    // Handle quick action clicks
  };

  const handleMetricClick = (metricType) => {
    console.log('Metric clicked:', metricType);
    // Navigate to filtered view
  };

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div>
          <h1 className="text-3xl font-bold font-heading text-gray-900">Dashboard</h1>
          <p className="text-gray-600 font-body mt-2">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div>
          <h1 className="text-3xl font-bold font-heading text-gray-900">Dashboard</h1>
          <div className="mt-4 card p-6 border-l-4 border-danger-500 bg-danger-50">
            <div className="flex">
              <ExclamationTriangleIcon className="h-6 w-6 text-danger-500 flex-shrink-0" aria-hidden="true" />
              <div className="ml-3">
                <h3 className="text-lg font-semibold font-heading text-danger-800">
                  Error loading dashboard
                </h3>
                <div className="mt-2 text-sm text-danger-700 font-body">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchDashboardData}
                    className="btn-primary bg-danger-600 hover:bg-danger-700 focus:ring-danger-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 lg:space-y-8"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={sectionVariants}>
        <h1 className="text-3xl lg:text-4xl font-bold font-heading text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-600 font-body mt-2 text-lg">
          Overview of stray dog management activities
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        variants={sectionVariants}
      >
        <MetricCard
          title="Total Dogs"
          value={stats?.total || 0}
          icon={UsersIcon}
          color="blue"
          change={dogs.length > 0 ? `${dogs.length} registered recently` : 'No recent registrations'}
          changeType="neutral"
          onClick={() => handleMetricClick('total')}
        />
        <MetricCard
          title="Sterilized"
          value={stats?.sterilized || 0}
          icon={ShieldCheckIcon}
          color="green"
          change={stats?.total ? `${Math.round((stats.sterilized / stats.total) * 100)}% completion rate` : 'No data'}
          changeType={stats?.sterilized > 0 ? "positive" : "neutral"}
          onClick={() => handleMetricClick('sterilized')}
        />
        <MetricCard
          title="Vaccinated"
          value={stats?.vaccinated || 0}
          icon={HeartIcon}
          color="yellow"
          change={stats?.total ? `${Math.round((stats.vaccinated / stats.total) * 100)}% vaccination rate` : 'No data'}
          changeType={stats?.vaccinated > 0 ? "positive" : "neutral"}
          onClick={() => handleMetricClick('vaccinated')}
        />
        <MetricCard
          title="Need Attention"
          value={stats?.injured || 0}
          icon={ExclamationTriangleIcon}
          color="red"
          change={stats?.injured > 0 ? 'Immediate care required' : 'All dogs healthy'}
          changeType={stats?.injured > 0 ? "negative" : "positive"}
          onClick={() => handleMetricClick('injured')}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Recent Activity - Takes 2 columns on xl screens */}
        <motion.div 
          className="xl:col-span-2"
          variants={sectionVariants}
        >
          <RecentRegistrations 
            dogs={dogs} 
            onDogClick={handleDogClick}
            loading={loading}
          />
        </motion.div>

        {/* Quick Actions - Takes 1 column on xl screens */}
        <motion.div variants={sectionVariants}>
          <QuickActions onActionClick={handleActionClick} />
        </motion.div>
      </div>

      {/* Additional Insights */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
        variants={sectionVariants}
      >
        {/* Health Status Overview */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold font-heading text-gray-900 mb-4">
            Health Status Distribution
          </h3>
          <div className="space-y-3">
            {[
              { status: 'Healthy', count: (stats?.total || 0) - (stats?.injured || 0) - (stats?.sick || 0), color: 'success' },
              { status: 'Injured', count: stats?.injured || 0, color: 'danger' },
              { status: 'Sick', count: stats?.sick || 0, color: 'warning' }
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    item.color === 'success' ? 'bg-success-500' :
                    item.color === 'danger' ? 'bg-danger-500' :
                    'bg-warning-500'
                  }`}></div>
                  <span className="text-sm font-medium font-body text-gray-700">{item.status}</span>
                </div>
                <span className="text-sm font-semibold font-heading text-gray-900">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold font-heading text-gray-900 mb-4">
            Today's Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium font-body text-gray-700">New Registrations</span>
              <span className="text-sm font-semibold font-heading text-gray-900">
                {dogs.filter(dog => {
                  const today = new Date();
                  const dogDate = new Date(dog.createdAt);
                  return dogDate.toDateString() === today.toDateString();
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium font-body text-gray-700">Vaccinations</span>
              <span className="text-sm font-semibold font-heading text-gray-900">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium font-body text-gray-700">Sterilizations</span>
              <span className="text-sm font-semibold font-heading text-gray-900">0</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
