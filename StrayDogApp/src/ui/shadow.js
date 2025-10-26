import { Platform } from 'react-native';

const boxShadows = {
  1: '0px 1px 2px rgba(0, 0, 0, 0.10)',
  2: '0px 2px 4px rgba(0, 0, 0, 0.10)',
  3: '0px 4px 8px rgba(0, 0, 0, 0.15)',
  4: '0px 8px 16px rgba(0, 0, 0, 0.20)'
};

const iosHeights = { 1: 1, 2: 2, 3: 4, 4: 8 };
const iosRadii = { 1: 2, 2: 4, 3: 8, 4: 12 };
const androidElevation = { 1: 1, 2: 3, 3: 6, 4: 8 };

/**
 * Creates cross-platform shadow styles
 * @param {number} level - Shadow intensity (1-4)
 * @param {object} options - Additional options
 * @param {string} options.color - Shadow color (default: '#000')
 * @param {number} options.opacity - Shadow opacity override
 * @returns {object} Platform-specific shadow styles
 */
export function shadow(level = 2, options = {}) {
  const opacity = options.opacity ?? (level >= 3 ? 0.15 : 0.1);
  const color = options.color ?? '#000';

  // For web platform, always use boxShadow to avoid deprecation warnings
  if (Platform.OS === 'web') {
    return {
      boxShadow: boxShadows[level] || boxShadows[2],
    };
  }

  return Platform.select({
    ios: {
      // Legacy shadow props for iOS (until RN 0.76+ migration)
      shadowColor: color,
      shadowOffset: { width: 0, height: iosHeights[level] ?? 2 },
      shadowOpacity: opacity,
      shadowRadius: iosRadii[level] ?? 4,
    },
    android: {
      // Use elevation for Android
      elevation: androidElevation[level] ?? 3,
      shadowColor: color, // Android also supports shadowColor with elevation
    },
    default: {
      // Fallback for future platforms or RN 0.76+ with New Architecture
      boxShadow: boxShadows[level] || boxShadows[2],
    },
  });
}

/**
 * Modern shadow utility for React Native 0.76+ with New Architecture
 * Use this when upgrading to RN 0.76+ to replace legacy shadow props
 * @param {number} level - Shadow intensity (1-4)
 * @param {object} options - Additional options
 * @returns {object} Modern boxShadow styles
 */
export function modernShadow(level = 2, options = {}) {
  const shadowValue = boxShadows[level] || boxShadows[2];
  
  return {
    boxShadow: shadowValue,
  };
}
