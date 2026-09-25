import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || '';
const baseURL = rawBaseURL ? (rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/$/, '')}/api`) : '/api';

const API = axios.create({
  baseURL,
  timeout: 30000,
});

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = rawBaseURL ? rawBaseURL.replace(/\/api\/?$/, '') : '';
  if (backendBase) {
    return url.startsWith('/') ? `${backendBase}${url}` : `${backendBase}/${url}`;
  }
  return url;
};

// Attach token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('stylist_user') || 'null');
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Handle 401 responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('stylist_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

// ── Wardrobe ──
export const wardrobeAPI = {
  getItems: (params) => API.get('/wardrobe', { params }),
  getItem: (id) => API.get(`/wardrobe/${id}`),
  addItem: (formData) => API.post('/wardrobe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  predictItem: (formData) => API.post('/wardrobe/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateItem: (id, data) => API.put(`/wardrobe/${id}`, data),
  deleteItem: (id) => API.delete(`/wardrobe/${id}`),
  getStats: () => API.get('/wardrobe/stats'),
  getLaundry: () => API.get('/wardrobe/laundry'),
  clearLaundryItem: (id) => API.put(`/wardrobe/laundry/${id}/clear`),
  clearAllLaundry: () => API.put('/wardrobe/laundry/clear-all'),
  scheduleLaundry: (id, readyAt) => API.put(`/wardrobe/laundry/${id}/schedule`, { readyAt }),
};

// ── Recommendations ──
export const recommendAPI = {
  getDailyTop5: (data) => API.post('/recommendations/daily', data),
  markAsWorn: (data) => API.post('/recommendations/worn', data),
  saveFavorite: (data) => API.post('/recommendations/favorite', data),
  getFavorites: () => API.get('/recommendations/favorites'),
  getHistory: () => API.get('/recommendations/history'),
};

// ── Weekly Plan ──
export const weeklyAPI = {
  getPlan: () => API.get('/weekly-plan'),
  generatePlan: () => API.post('/weekly-plan/generate'),
  updateDay: (data) => API.put('/weekly-plan/day', data),
  completeLaundry: () => API.post('/weekly-plan/laundry'),
  markDayWorn: (data) => API.post('/weekly-plan/worn', data),
};

// ── Weather ──
export const weatherAPI = {
  getCurrent: () => API.get('/weather/current'),
  getWeekly: () => API.get('/weather/weekly'),
};

export default API;
