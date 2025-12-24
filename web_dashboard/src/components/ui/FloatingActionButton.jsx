import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  HeartIcon,
  DocumentTextIcon,
  MapPinIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const quickActions = [
  {
    id: 'new-dog',
    name: 'Register Dog',
    description: 'Add a new stray dog',
    icon: HeartIcon,
    color: 'primary',
    path: '/dogs',
    action: 'register'
  },
  {
    id: 'new-report',
    name: 'Create Report',
    description: 'Generate analytics report',
    icon: DocumentTextIcon,
    color: 'success',
    path: '/analytics'
  },
  {
    id: 'view-map',
    name: 'View Map',
    description: 'See dogs on map',
    icon: MapPinIcon,
    color: 'warning',
    path: '/map'
  }
];

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleActionClick = (action) => {
    navigate(action.path);
    setIsOpen(false);
  };

  const colorClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    success: 'bg-success-500 hover:bg-success-600 text-white',
    warning: 'bg-warning-500 hover:bg-warning-600 text-white'
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 lg:hidden">
      {/* Action Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-20 right-0 space-y-3 min-w-[200px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl shadow-lg ${colorClasses[action.color]} backdrop-blur-sm`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="text-sm font-semibold">{action.name}</div>
                    <div className="text-xs opacity-90">{action.description}</div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full shadow-lg text-white"
        whileHover={{ scale: 1.1, boxShadow: "0 10px 30px -5px rgba(59, 130, 246, 0.4)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <XMarkIcon className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="plus"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PlusIcon className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
