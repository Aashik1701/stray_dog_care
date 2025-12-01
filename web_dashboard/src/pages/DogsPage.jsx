import { useState, useEffect, useCallback } from 'react';
import DogsTable from '../components/tables/DogsTable';
import EmptyState from '../components/ui/EmptyState';
import apiService from '../services/api';
import socketService from '../services/socket';
import { useToast } from '../contexts/ToastContext';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

export default function DogsPage() {
  const toast = useToast();
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

  const fetchDogs = useCallback(async (page = 1) => {
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
  }, [filters]);

  useEffect(() => {
    fetchDogs();
  }, [fetchDogs]);

  // Real-time updates: Listen for new dog registrations
  useEffect(() => {
    // Listen for dog.created event (emitted by backend when dog is added)
    const unsubscribeCreated = socketService.on('dog.created', (newDog) => {
      console.log('[DogsPage] New dog registered:', newDog);
      
      // Show notification
      toast.success(`New dog registered: ${newDog.dogId || 'Unknown'} in ${newDog.zone || 'Unknown zone'}`);
      
      // Refresh the current page to show the new dog
      fetchDogs(pagination.currentPage);
    });

    // Listen for dog-registered event (alternative event name)
    const unsubscribeRegistered = socketService.on('dog-registered', (data) => {
      console.log('[DogsPage] Dog registered (legacy event):', data);
      toast.success('New dog registered!');
      fetchDogs(pagination.currentPage);
    });

    // Listen for dog status changes
    const unsubscribeStatusChanged = socketService.on('dog-status-changed', (data) => {
      console.log('[DogsPage] Dog status changed:', data);
      
      toast.info('A dog\'s status was updated');
      
      // Update the specific dog in the list without full refresh
      setDogs(prevDogs => 
        prevDogs.map(dog => 
          dog._id === data._id ? { ...dog, ...data } : dog
        )
      );
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeCreated();
      unsubscribeRegistered();
      unsubscribeStatusChanged();
    };
  }, [fetchDogs, pagination.currentPage, toast]);

  // fetchDogs is memoized; keep reference for pagination buttons

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dogs Registry</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage and view all registered dogs</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          Register New Dog
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filters</h3>
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
            <label htmlFor="filter-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="filter-search"
                name="search"
                type="text"
                aria-label="Search dogs"
                placeholder="Search by ID, name, or location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="filter-status"
              name="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
            <label htmlFor="filter-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Size
            </label>
            <select
              id="filter-size"
              name="size"
              value={filters.size}
              onChange={(e) => handleFilterChange('size', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Sizes</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          {/* Vaccinated */}
          <div>
            <label htmlFor="filter-vaccinated" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vaccinated
            </label>
            <select
              id="filter-vaccinated"
              name="isVaccinated"
              value={filters.isVaccinated}
              onChange={(e) => handleFilterChange('isVaccinated', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Sterilized */}
          <div>
            <label htmlFor="filter-sterilized" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sterilized
            </label>
            <select
              id="filter-sterilized"
              name="isSterilized"
              value={filters.isSterilized}
              onChange={(e) => handleFilterChange('isSterilized', e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
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

      {/* Dogs Table or Empty State */}
      {(!loading && !error && dogs.length === 0) ? (
        <EmptyState
          title="No dogs found"
          description="Try clearing filters or register a new dog to get started."
          action={(
            <button className="btn-primary">Register New Dog</button>
          )}
        />
      ) : (
        <DogsTable 
          dogs={dogs} 
          onRowClick={handleDogClick}
          loading={loading}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => fetchDogs(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              onClick={() => fetchDogs(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => fetchDogs(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchDogs(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
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
