import React from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const ErrorBoundary = ({ 
  error, 
  onRetry, 
  title = "Something went wrong", 
  type = "error",
  className = "",
  showRetry = true 
}) => {
  const typeConfig = {
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-danger-50',
      borderColor: 'border-danger-200',
      iconColor: 'text-danger-500',
      titleColor: 'text-danger-800',
      textColor: 'text-danger-700',
      buttonColor: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      iconColor: 'text-warning-500',
      titleColor: 'text-warning-800',
      textColor: 'text-warning-700',
      buttonColor: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      iconColor: 'text-primary-500',
      titleColor: 'text-primary-800',
      textColor: 'text-primary-700',
      buttonColor: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
    },
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      iconColor: 'text-success-500',
      titleColor: 'text-success-800',
      textColor: 'text-success-700',
      buttonColor: 'bg-success-600 hover:bg-success-700 focus:ring-success-500'
    }
  };

  const config = typeConfig[type] || typeConfig.error;
  const Icon = config.icon;

  return (
    <motion.div 
      className={`card ${config.bgColor} border-l-4 ${config.borderColor} p-6 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Icon className={`h-6 w-6 ${config.iconColor} flex-shrink-0`} aria-hidden="true" />
        </motion.div>
        <div className="ml-3 flex-1">
          <h3 className={`text-lg font-semibold font-heading ${config.titleColor}`}>
            {title}
          </h3>
          {error && (
            <div className={`mt-2 text-sm font-body ${config.textColor}`}>
              {typeof error === 'string' ? error : error.message || 'An unexpected error occurred'}
            </div>
          )}
          {showRetry && onRetry && (
            <div className="mt-4">
              <motion.button
                onClick={onRetry}
                className={`btn-primary ${config.buttonColor}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Try again
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = "" 
}) => (
  <motion.div 
    className={`text-center py-12 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
    >
      {Icon && <Icon className="h-16 w-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />}
    </motion.div>
    <h3 className="text-lg font-medium font-heading text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 font-body mb-6">{description}</p>
    {action && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {action}
      </motion.div>
    )}
  </motion.div>
);

export { ErrorBoundary, EmptyState };
export default ErrorBoundary;
