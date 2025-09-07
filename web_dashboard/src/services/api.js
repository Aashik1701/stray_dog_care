const API_BASE_URL = 'http://localhost:3000/api';

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

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
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
}

export default new ApiService();
