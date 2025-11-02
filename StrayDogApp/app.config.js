// Dynamic Expo config to inject Google Maps API keys and other environment-based settings
// Usage:
//   EXPO_PUBLIC_API_URL=... EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
//   GOOGLE_MAPS_IOS_API_KEY=... GOOGLE_MAPS_ANDROID_API_KEY=...
// will be read at build/dev time.
// app.config.js
module.exports = ({ config }) => {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    config?.expo?.extra?.apiUrl ||
    'http://localhost:3000';

  const publicGMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const iosGMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY || publicGMapsKey;
  const androidGMapsKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY || publicGMapsKey;

  return {
    expo: {
      name: config?.expo?.name || 'StrayDogApp',
      slug: config?.expo?.slug || 'straydogapp',
      version: config?.expo?.version || '1.0.0',

      extra: {
        apiUrl,
        googleMapsApiKey: publicGMapsKey,
      },

      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.anonymous.straydogapp', // ✅ Added this
        config: {
          googleMapsApiKey: iosGMapsKey,
        },
      },

      android: {
        package: 'com.anonymous.straydogapp', // ✅ Already correct
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#FFFFFF',
        },
        config: {
          googleMaps: {
            apiKey: androidGMapsKey,
          },
        },
      },

      plugins: ['expo-font'],
    },
  };
};
