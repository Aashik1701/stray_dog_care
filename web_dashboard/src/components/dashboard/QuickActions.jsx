import React from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon, 
  MapPinIcon, 
  ChartBarIcon,
  PlusIcon,
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const quickActions = [
  {
    name: 'Register New Dog',
    description: 'Add a new stray dog to the system',
    icon: HeartIcon,
    color: 'primary',
    href: '/dogs/new'
  },
  {
    name: 'View Map',
    description: 'See all dogs on the interactive map',
    icon: MapPinIcon,
    color: 'success',
    href: '/map'
  },
  {
    name: 'Generate Report',
    description: 'Create statistical reports',
    icon: DocumentTextIcon,
    color: 'warning',
    href: '/reports'
  },
  {
    name: 'Manage Users',
    description: 'User and team management',
    icon: UserGroupIcon,
    color: 'purple',
    href: '/users'
  },
  {
    name: 'Analytics',
    description: 'View detailed analytics',
    icon: ChartBarIcon,
    color: 'indigo',
    href: '/analytics'
  },
  {
    name: 'Quick Entry',
    description: 'Fast dog registration',
    icon: PlusIcon,
    color: 'emerald',
    href: '/quick-entry'
  }
];

const colorVariants = {
  primary: {
    bg: 'bg-primary-50 hover:bg-primary-100',
    text: 'text-primary-600',
    border: 'border-primary-200 hover:border-primary-300',
    shadow: 'hover:shadow-primary-500/20'
  },
  success: {
    bg: 'bg-success-50 hover:bg-success-100',
    text: 'text-success-600',
    border: 'border-success-200 hover:border-success-300',
    shadow: 'hover:shadow-success-500/20'
  },
  warning: {
    bg: 'bg-warning-50 hover:bg-warning-100',
    text: 'text-warning-600',
    border: 'border-warning-200 hover:border-warning-300',
    shadow: 'hover:shadow-warning-500/20'
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-200 hover:border-purple-300',
    shadow: 'hover:shadow-purple-500/20'
  },
  indigo: {
    bg: 'bg-indigo-50 hover:bg-indigo-100',
    text: 'text-indigo-600',
    border: 'border-indigo-200 hover:border-indigo-300',
    shadow: 'hover:shadow-indigo-500/20'
  },
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-300',
    shadow: 'hover:shadow-emerald-500/20'
  }
};

export default function QuickActions({ onActionClick }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const handleActionClick = (action) => {
    if (onActionClick) {
      onActionClick(action);
    } else {
      // Default behavior - you could navigate here
      console.log(`Navigating to ${action.href}`);
    }
  };

  return (
    <motion.div 
      className="card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold font-heading text-gray-900">Quick Actions</h2>
        <p className="text-sm text-gray-500 font-body">Common tasks and shortcuts</p>
      </div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {quickActions.map((action) => {
          const colors = colorVariants[action.color] || colorVariants.primary;
          
          return (
            <motion.button
              key={action.name}
              variants={itemVariants}
              className={`group relative p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${colors.bg} ${colors.border}`}
              onClick={() => handleActionClick(action)}
              whileHover={{ 
                y: -2,
                boxShadow: `0 10px 25px -5px ${colors.shadow}`
              }}
              whileTap={{ scale: 0.98 }}
              aria-label={`${action.name}: ${action.description}`}
            >
              <div className="flex items-start space-x-3">
                <motion.div 
                  className={`flex-shrink-0 p-2 rounded-lg ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform duration-200`}
                  whileHover={{ rotate: 5 }}
                >
                  <action.icon className="h-6 w-6" aria-hidden="true" />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold font-heading ${colors.text} group-hover:text-opacity-80 transition-colors duration-200`}>
                    {action.name}
                  </h3>
                  <p className="text-xs text-gray-600 font-body mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>

              {/* Hover overlay */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-white bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"
                initial={false}
                whileHover={{ scale: 1.02 }}
              />

              {/* Focus ring */}
              <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-focus:ring-primary-500 transition-all duration-200" />
            </motion.button>
          );
        })}
      </motion.div>

      {/* Additional actions hint */}
      <motion.div 
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-xs text-gray-400 font-body">
          More actions available in the main navigation menu
        </p>
      </motion.div>
    </motion.div>
  );
}
