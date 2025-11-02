import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseURL() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) {
    const url = envUrl.replace(/\/$/, '');
    console.log('🌐 API URL from env:', url);
    return url;
  }
  // Try to get from Expo config
  try {
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;
    if (apiUrl) {
      const url = apiUrl.replace(/\/$/, '');
      console.log('🌐 API URL from app.json:', url);
      return url;
    }
  } catch {}
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri && hostUri.includes(':')) {
      const host = hostUri.split(':')[0];
      const url = `http://${host}:3000`;
      console.log('🌐 API URL from hostUri:', url);
      return url;
    }
  } catch {}

  // Fallback for web/dev
  const fallback = 'http://localhost:3000';
  console.warn('⚠️ Using fallback API URL:', fallback);
  console.warn('💡 To fix: Set EXPO_PUBLIC_API_URL env var or apiUrl in app.json');
  return fallback;
}

const baseURL = resolveBaseURL();
const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 15000,
});

console.log('🔗 API Base URL:', api.defaults.baseURL);

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

// Demo mode toggle (explicit only)
const DEMO_MODE = (() => {
  try {
    const v = Constants.expoConfig?.extra?.demoMode;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true';
  } catch {}
  if (typeof process !== 'undefined') {
    const v = process.env?.EXPO_PUBLIC_DEMO_MODE || process.env?.DEMO_MODE;
    if (typeof v === 'string') return v === 'true';
  }
  return false;
})();

// Check if token is a demo token
const isDemoToken = (token) => token && token.startsWith('demo-token');
// Only mock when explicitly in demo mode and using a demo token
const isDemoMode = () => DEMO_MODE && isDemoToken(authToken);

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
  // If explicitly in demo mode and using demo token, return mock data for known endpoints
  if (isDemoMode()) {
      const { url, method, data } = error.config;
      
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

      // Mock NLP analyze report in demo mode
      if (url.includes('/nlp/analyze-report') && method === 'post') {
        let payload = {};
        try { payload = typeof data === 'string' ? JSON.parse(data) : (data || {}); } catch {}
        const txt = (payload.text || '').toLowerCase();
        const urgent = /bleed|injur|critical|urgent|bite/.test(txt);
        const summary = 'Dog reported with possible injury near Indiranagar. Needs attention.';
        const entities = {
          breeds: [],
          locations: ['Indiranagar', 'MG Road', 'Koramangala'],
          symptoms: urgent ? ['injury', 'bleed'] : ['weak'],
          dates: []
        };
        const resp = {
          category: urgent ? 'injury case' : 'general sighting',
          confidence: urgent ? 0.82 : 0.55,
          sentiment: urgent ? 'negative' : 'neutral',
          urgency: urgent ? 0.78 : 0.42,
          urgency_score: urgent ? 0.78 : 0.42,
          summary,
          entities
        };
        return Promise.resolve({ data: { success: true, data: resp } });
      }

      // Mock dog creation endpoints in demo mode
      if ((url.includes('/dogs') || url.includes('/dogs/nlp')) && method === 'post') {
        let payload = {};
        try { payload = typeof data === 'string' ? JSON.parse(data) : (data || {}); } catch {}
        const now = new Date();
        const created = {
          _id: 'demo-dog-' + now.getTime(),
          dogId: `DOG_${now.getFullYear()}_${Math.floor(Math.random()*100000).toString().padStart(5,'0')}`,
          size: payload.size || 'medium',
          color: payload.color || 'unknown',
          breed: payload.breed || 'mixed',
          gender: payload.gender || 'unknown',
          estimatedAge: payload.estimatedAge || 'unknown',
          location: { type: 'Point', coordinates: payload.coordinates || [77.6, 12.97] },
          address: payload.address || {},
          zone: payload.zone || 'Zone 1',
          healthStatus: payload.healthStatus || {},
          behavior: payload.behavior || {},
          images: payload.images || [],
          notes: payload.notes,
          status: 'active',
          reportedBy: getMockUserData()._id,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        return Promise.resolve({ data: { success: true, message: 'Dog registered (demo)', data: created } });
      }
    }
    
    return Promise.reject(error);
  }
);
export default api;
