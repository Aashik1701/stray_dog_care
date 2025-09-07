import React, { useState, useEffect } from 'react';
import StatsCard from '../components/dashboard/StatsCard';
import DogsTable from '../components/tables/DogsTable';
import apiService from '../services/api';
import { 
  UsersIcon, 
  HeartIcon, 
  MapPinIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

      if (dogsResponse.success) {
        setDogs(dogsResponse.data.dogs);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDogClick = (dog) => {
    console.log('Dog clicked:', dog);
    // Navigate to dog details page when implemented
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading dashboard
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchDashboardData}
                    className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of stray dog management activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Dogs"
          value={stats?.total || 0}
          icon={UsersIcon}
          color="blue"
          change={dogs.length > 0 ? `${dogs.length} registered recently` : 'No recent registrations'}
        />
        <StatsCard
          title="Sterilized"
          value={stats?.sterilized || 0}
          icon={HeartIcon}
          color="green"
          change={stats?.total ? `${Math.round((stats.sterilized / stats.total) * 100)}% completion rate` : 'No data'}
        />
        <StatsCard
          title="Vaccinated"
          value={stats?.vaccinated || 0}
          icon={MapPinIcon}
          color="yellow"
          change={stats?.total ? `${Math.round((stats.vaccinated / stats.total) * 100)}% vaccination rate` : 'No data'}
        />
        <StatsCard
          title="Need Attention"
          value={stats?.injured || 0}
          icon={ExclamationTriangleIcon}
          color="red"
          change={stats?.injured > 0 ? 'Immediate care required' : 'All dogs healthy'}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Registrations</h2>
            <p className="text-sm text-gray-500">Latest dogs added to the system</p>
          </div>
          <DogsTable 
            dogs={dogs} 
            onRowClick={handleDogClick}
            loading={loading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <HeartIcon className="h-5 w-5 mr-2" />
            Register New Dog
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <MapPinIcon className="h-5 w-5 mr-2" />
            View Map
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <UsersIcon className="h-5 w-5 mr-2" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
