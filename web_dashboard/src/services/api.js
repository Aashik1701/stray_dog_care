const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Mock data for demo mode
  getMockUserData() {
    return {
      _id: 'demo-user-web-123',
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
    };
  }

  getMockStatsData() {
    return {
      total: 25,
      sterilized: 12,
      vaccinated: 18,
      injured: 3,
      adopted: 5
    };
  }

  // Check if token is a demo token
  isDemoToken(token) {
    return token && token.startsWith('demo-token');
  }

  getMockDogsData() {
    return [
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
        reportedBy: 'demo-user-web-123',
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
        reportedBy: 'demo-user-web-123',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  async request(endpoint, options = {}) {
    // Handle demo mode for specific endpoints
    if (this.isDemoToken(this.token)) {
      if (endpoint === '/auth/me' && (!options.method || options.method === 'GET')) {
        return {
          success: true,
          data: this.getMockUserData()
        };
      }
      
      if (endpoint === '/dogs/stats' && (!options.method || options.method === 'GET')) {
        return {
          success: true,
          data: this.getMockStatsData()
        };
      }

      if (endpoint.startsWith('/dogs') && !endpoint.includes('/') && (!options.method || options.method === 'GET')) {
        // Handle /dogs endpoint for listing dogs
        return {
          success: true,
          data: {
            dogs: this.getMockDogsData(),
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalDogs: 2,
              hasNextPage: false,
              hasPrevPage: false
            }
          }
        };
      }
    }

    const url = `${API_BASE_URL}/api${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        // Non-JSON response (likely an error page or rate limit)
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 100));
        throw new Error(text.substring(0, 100) || 'Server returned non-JSON response');
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.setToken(null);
    return response;
  }

  async getMe() {
    return this.request('/auth/me');
  }
  
  // Profile settings
  async updateMe(update) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // Security
  async changePassword({ currentPassword, newPassword }) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Dogs methods
  async getDogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/dogs?${queryString}` : '/dogs';
    return this.request(endpoint);
  }

  async getDogById(id) {
    return this.request(`/dogs/${id}`);
  }

  async createDog(dogData) {
    return this.request('/dogs', {
      method: 'POST',
      body: JSON.stringify(dogData),
    });
  }

  async updateDog(id, dogData) {
    return this.request(`/dogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dogData),
    });
  }

  async updateDogStatus(id, statusData) {
    return this.request(`/dogs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  }

  async getDogsStatistics() {
    return this.request('/dogs/stats');
  }

  async getDogsByLocation(longitude, latitude, maxDistance) {
    const params = new URLSearchParams({
      longitude,
      latitude,
      maxDistance: maxDistance || 5000,
    });
    return this.request(`/dogs/location?${params}`);
  }

  async deleteDog(id) {
    return this.request(`/dogs/${id}`, {
      method: 'DELETE',
    });
  }

  // NLP methods
  async getNLPStatus() {
    if (this.isDemoToken(this.token)) {
      return { success: true, data: { enabled: true, circuitOpen: false, failureCount: 0 } };
    }
    return this.request('/nlp/status');
  }

  // Reports analytics
  async getReportsAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const endpoint = qs ? `/reports/analytics/summary?${qs}` : '/reports/analytics/summary';
    return this.request(endpoint);
  }
}

export default new ApiService();
