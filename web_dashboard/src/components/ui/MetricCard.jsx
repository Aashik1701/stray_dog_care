import React from 'react';
import { motion } from 'framer-motion';
import { cva } from 'class-variance-authority';

const metricCardVariants = cva(
  "relative overflow-hidden card p-6 group",
  {
    variants: {
      color: {
        blue: "before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-primary-500",
        green: "before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-success-500",
        yellow: "before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-warning-500",
        red: "before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-danger-500",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
      }
    },
    defaultVariants: {
      color: "blue",
      size: "default",
    }
  }
);

const iconVariants = cva(
  "flex-shrink-0 p-3 rounded-xl transition-all duration-200 group-hover:scale-110",
  {
    variants: {
      color: {
        blue: "text-primary-600 bg-primary-50 group-hover:bg-primary-100",
        green: "text-success-600 bg-success-50 group-hover:bg-success-100",
        yellow: "text-warning-600 bg-warning-50 group-hover:bg-warning-100",
        red: "text-danger-600 bg-danger-50 group-hover:bg-danger-100",
      }
    },
    defaultVariants: {
      color: "blue",
    }
  }
);

const valueVariants = cva(
  "font-heading font-bold transition-colors duration-200",
  {
    variants: {
      color: {
        blue: "text-gray-900 group-hover:text-primary-700",
        green: "text-gray-900 group-hover:text-success-700",
        yellow: "text-gray-900 group-hover:text-warning-700",
        red: "text-gray-900 group-hover:text-danger-700",
      },
      size: {
        sm: "text-xl",
        default: "text-2xl lg:text-3xl",
        lg: "text-3xl lg:text-4xl",
      }
    },
    defaultVariants: {
      color: "blue",
      size: "default",
    }
  }
);

export default function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  change, 
  changeType,
  size = 'default',
  onClick,
  className = '',
  ...props 
}) {
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      y: -2,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };

  const changeColors = {
    positive: 'text-success-600 bg-success-50',
    negative: 'text-danger-600 bg-danger-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  const MotionCard = onClick ? motion.button : motion.div;

  return (
    <MotionCard
      className={`${metricCardVariants({ color, size })} ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500' : ''} ${className}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `${title}: ${value}. ${change || ''}` : undefined}
      {...props}
    >
      <div className="flex items-center">
        <motion.div 
          className={iconVariants({ color })}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          {Icon && (
            <Icon 
              className="h-6 w-6 lg:h-7 lg:w-7" 
              aria-hidden="true"
            />
          )}
        </motion.div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <motion.dt 
              className="text-sm font-medium font-body text-gray-500 truncate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {title}
            </motion.dt>
            <motion.dd 
              className={valueVariants({ color, size })}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.dd>
          </dl>
        </div>
      </div>
      
      {change && (
        <motion.div 
          className="mt-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <motion.div 
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium font-body ${
              changeColors[changeType] || changeColors.neutral
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            {change}
          </motion.div>
        </motion.div>
      )}
    </MotionCard>
  );
}
