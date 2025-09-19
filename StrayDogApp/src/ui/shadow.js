import { Platform } from 'react-native';

const webShadows = {
  1: '0 1px 2px rgba(0,0,0,0.10)',
  2: '0 2px 4px rgba(0,0,0,0.10)',
  3: '0 4px 8px rgba(0,0,0,0.15)',
  4: '0 8px 16px rgba(0,0,0,0.20)'
};

const iosHeights = { 1: 1, 2: 2, 3: 4, 4: 8 };
const iosRadii = { 1: 2, 2: 4, 3: 8, 4: 12 };
const androidElevation = { 1: 1, 2: 3, 3: 6, 4: 8 };

export function shadow(level = 2, options = {}) {
  const opacity = options.opacity ?? (level >= 3 ? 0.15 : 0.1);
  const color = options.color ?? '#000';

  return Platform.select({
    web: { boxShadow: webShadows[level] || webShadows[2] },
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: iosHeights[level] ?? 2 },
      shadowOpacity: opacity,
      shadowRadius: iosRadii[level] ?? 4,
    },
    android: { elevation: androidElevation[level] ?? 3 },
    default: {},
  });
}
