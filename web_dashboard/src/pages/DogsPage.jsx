import { useState, useEffect } from 'react';
import DogsTable from '../components/tables/DogsTable';
import apiService from '../services/api';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

export default function DogsPage() {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    zone: '',
    isVaccinated: '',
    isSterilized: '',
    size: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalDogs: 0
  });

  useEffect(() => {
    fetchDogs();
  }, [filters]);

  const fetchDogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 20,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== '')
        )
      };

      const response = await apiService.getDogs(params);

      if (response.success) {
        setDogs(response.data.dogs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDogClick = (dog) => {
    console.log('Dog clicked:', dog);
    // Navigate to dog details page when implemented
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      zone: '',
      isVaccinated: '',
      isSterilized: '',
      size: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dogs Registry</h1>
          <p className="text-gray-600">Manage and view all registered dogs</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          Register New Dog
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by ID, name, or location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="adopted">Adopted</option>
              <option value="deceased">Deceased</option>
              <option value="relocated">Relocated</option>
            </select>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size
            </label>
            <select
              value={filters.size}
              onChange={(e) => handleFilterChange('size', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Sizes</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          {/* Vaccinated */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vaccinated
            </label>
            <select
              value={filters.isVaccinated}
              onChange={(e) => handleFilterChange('isVaccinated', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Sterilized */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sterilized
            </label>
            <select
              value={filters.isSterilized}
              onChange={(e) => handleFilterChange('isSterilized', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {dogs.length} of {pagination.totalDogs} dogs
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4" />
            <span>Filters active: {Object.values(filters).filter(v => v !== '').length}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">
            Error loading dogs: {error}
            <button
              onClick={() => fetchDogs()}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Dogs Table */}
      <DogsTable 
        dogs={dogs} 
        onRowClick={handleDogClick}
        loading={loading}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => fetchDogs(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => fetchDogs(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => fetchDogs(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchDogs(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
