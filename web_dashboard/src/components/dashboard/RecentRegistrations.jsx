import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  MapPinIcon, 
  HeartIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function RecentRegistrations({ dogs = [], loading = false, onDogClick }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold font-heading text-gray-900">Recent Registrations</h2>
          <p className="text-sm text-gray-500 font-body">Latest dogs added to the system</p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i} 
              className="animate-pulse"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl">
                <motion.div 
                  className="h-12 w-12 bg-gray-200 rounded-xl"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                ></motion.div>
                <div className="flex-1 space-y-2">
                  <motion.div 
                    className="h-4 bg-gray-200 rounded w-1/3"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                  ></motion.div>
                  <motion.div 
                    className="h-3 bg-gray-200 rounded w-1/2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  ></motion.div>
                </div>
                <motion.div 
                  className="h-8 w-20 bg-gray-200 rounded"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                ></motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold font-heading text-gray-900">Recent Registrations</h2>
        <p className="text-sm text-gray-500 font-body">Latest dogs added to the system</p>
      </div>

      {dogs.length === 0 ? (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium font-heading text-gray-900 mb-2">No recent registrations</h3>
          <p className="text-gray-500 font-body">Dogs registered today will appear here</p>
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {dogs.slice(0, 5).map((dog, index) => (
            <motion.div
              key={dog._id || index}
              variants={itemVariants}
              className="group relative p-4 border border-gray-200 rounded-xl hover:border-primary-200 hover:shadow-medium transition-all duration-200 cursor-pointer"
              onClick={() => onDogClick && onDogClick(dog)}
              whileHover={{ y: -2 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onDogClick) {
                  e.preventDefault();
                  onDogClick(dog);
                }
              }}
              aria-label={`View details for ${dog.name || 'Unnamed dog'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Dog Avatar */}
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.05 }}
                  >
                    {dog.photos && dog.photos.length > 0 ? (
                      <img
                        src={dog.photos[0]}
                        alt={`${dog.name || 'Dog'} photo`}
                        className="h-14 w-14 rounded-xl object-cover border-2 border-gray-200 group-hover:border-primary-300 transition-colors duration-200"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-2 border-gray-200 group-hover:border-primary-300 transition-colors duration-200">
                        <HeartIcon className="h-7 w-7 text-primary-600" aria-hidden="true" />
                      </div>
                    )}
                    
                    {/* Status indicator */}
                    <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                      dog.healthStatus === 'injured' ? 'bg-danger-500' :
                      dog.healthStatus === 'sick' ? 'bg-warning-500' :
                      'bg-success-500'
                    }`} title={`Health status: ${dog.healthStatus || 'healthy'}`}></div>
                  </motion.div>

                  {/* Dog Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-semibold font-heading text-gray-900 truncate">
                        {dog.name || 'Unnamed'}
                      </h3>
                      {dog.breed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {dog.breed}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {dog.location && (
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="h-3 w-3" aria-hidden="true" />
                          <span className="truncate max-w-32">
                            {typeof dog.location === 'string' ? dog.location : 
                             dog.location.address || `${dog.location.latitude}, ${dog.location.longitude}`}
                          </span>
                        </div>
                      )}
                      
                      {dog.createdAt && (
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" aria-hidden="true" />
                          <span>{format(new Date(dog.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                      )}
                    </div>

                    {/* Health indicators */}
                    <div className="flex items-center space-x-2 mt-2">
                      {dog.isVaccinated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-700">
                          Vaccinated
                        </span>
                      )}
                      {dog.isSterilized && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                          Sterilized
                        </span>
                      )}
                      {dog.healthStatus === 'injured' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
                          Needs Attention
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <motion.button
                  className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDogClick && onDogClick(dog);
                  }}
                  aria-label={`View details for ${dog.name || 'dog'}`}
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </motion.button>
              </div>
            </motion.div>
          ))}

          {dogs.length > 5 && (
            <motion.div 
              className="text-center pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button className="btn-secondary">
                View All {dogs.length} Dogs
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
