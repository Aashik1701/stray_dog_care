// Loading.jsx
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import React from 'react';
const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <motion.div
      className={`inline-block ${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-full h-full border-2 rounded-full border-primary-200 border-t-primary-600"></div>
    </motion.div>
  );
};

const LoadingCard = ({ className = '' }) => (
  <motion.div 
    className={`card p-6 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center space-x-4">
      <motion.div 
        className="w-12 h-12 bg-gray-200 rounded-xl"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      ></motion.div>
      <div className="flex-1 space-y-2">
        <motion.div 
          className="w-3/4 h-4 bg-gray-200 rounded"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
        ></motion.div>
        <motion.div 
          className="w-1/2 h-3 bg-gray-200 rounded"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        ></motion.div>
      </div>
    </div>
  </motion.div>
);

const LoadingTable = ({ rows = 5, className = '' }) => (
  <motion.div 
    className={`card p-6 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="space-y-4">
      <motion.div 
        className="w-1/4 h-6 mb-6 bg-gray-200 rounded"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      ></motion.div>
      {[...Array(rows)].map((_, i) => (
        <motion.div 
          key={i} 
          className="flex items-center py-3 space-x-4 border-b border-gray-100 last:border-b-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        >
          <motion.div 
            className="w-1/4 h-4 bg-gray-200 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          ></motion.div>
          <motion.div 
            className="w-1/6 h-4 bg-gray-200 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.1 }}
          ></motion.div>
          <motion.div 
            className="w-1/4 h-4 bg-gray-200 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.2 }}
          ></motion.div>
          <motion.div 
            className="w-1/6 h-4 bg-gray-200 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.3 }}
          ></motion.div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export { LoadingSpinner, LoadingCard, LoadingTable };
export default LoadingSpinner;
