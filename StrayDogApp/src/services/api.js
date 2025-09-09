import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseURL() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  // Try to infer LAN IP from Expo host
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri && hostUri.includes(':')) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3000`;
    }
  } catch {}

  // Fallback for web/dev
  return 'http://localhost:3000';
}

const api = axios.create({
  baseURL: `${resolveBaseURL()}/api`,
  timeout: 15000,
});

let authToken = null;
export const setAuthToken = (token) => {
  authToken = token;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default api;
