import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseURL() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  // Try to get from Expo config
  try {
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;
    if (apiUrl) return apiUrl.replace(/\/$/, '');
  } catch {}

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

// Mock data for demo mode
const getMockUserData = () => ({
  _id: 'demo-user-123',
  username: 'demo_user',
  email: 'demo@straydogcare.com',
  role: 'field_worker',
  permissions: ['create_dog', 'edit_dog'],
  profile: {
    firstName: 'Demo',
    lastName: 'User',
    phoneNumber: '1234567890'
  },
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const getMockStatsData = () => ({
  total: 25,
  sterilized: 12,
  vaccinated: 18,
  injured: 3,
  adopted: 5
});

const getMockDogsData = () => ([
  {
    _id: 'demo-dog-1',
    dogId: 'DOG_2024_12345',
    name: 'Buddy',
    size: 'medium',
    color: 'brown',
    breed: 'mixed',
    gender: 'male',
    estimatedAge: 'adult',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716]
    },
    address: {
      street: 'MG Road',
      area: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka'
    },
    zone: 'Central Bangalore',
    healthStatus: {
      isHealthy: true,
      isVaccinated: true,
      isSterilized: true,
      lastHealthCheck: new Date().toISOString()
    },
    behavior: {
      isAggressive: false,
      isFriendly: true,
      fearLevel: 'low'
    },
    images: [],
    status: 'active',
    reportedBy: 'demo-user-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'demo-dog-2',
    dogId: 'DOG_2024_12346',
    name: 'Luna',
    size: 'small',
    color: 'white',
    breed: 'mixed',
    gender: 'female',
    estimatedAge: 'young',
    location: {
      type: 'Point',
      coordinates: [77.6146, 12.9816]
    },
    address: {
      street: '100 Feet Road',
      area: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka'
    },
    zone: 'East Bangalore',
    healthStatus: {
      isHealthy: false,
      isInjured: true,
      injuryDescription: 'Minor cut on paw',
      isVaccinated: false,
      isSterilized: false
    },
    behavior: {
      isAggressive: false,
      isFriendly: true,
      fearLevel: 'medium'
    },
    images: [],
    status: 'active',
    reportedBy: 'demo-user-123',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
]);

// Check if token is a demo token
const isDemoToken = (token) => token && token.startsWith('demo-token');

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor to handle demo mode
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If it's a demo token and the request failed, return mock data
    if (isDemoToken(authToken)) {
      const { url, method } = error.config;
      
      if (url.includes('/auth/me') && method === 'get') {
        return Promise.resolve({
          data: {
            success: true,
            data: getMockUserData()
          }
        });
      }
      
      if (url.includes('/dogs/stats') && method === 'get') {
        return Promise.resolve({
          data: {
            success: true,
            data: getMockStatsData()
          }
        });
      }

      if (url.includes('/dogs') && !url.includes('/dogs/') && method === 'get') {
        // Handle /dogs endpoint for listing dogs
        return Promise.resolve({
          data: {
            success: true,
            data: {
              dogs: getMockDogsData(),
              pagination: {
                currentPage: 1,
                totalPages: 1,
                totalDogs: 2,
                hasNextPage: false,
                hasPrevPage: false
              }
            }
          }
        });
      }

      if (url.includes('/dogs/location') && method === 'get') {
        // Handle /dogs/location endpoint for map
        return Promise.resolve({
          data: {
            success: true,
            data: getMockDogsData()
          }
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
