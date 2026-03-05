import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('busgo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('busgo_token');
      localStorage.removeItem('busgo_user');
      // Avoid import cycle — dispatch a custom event instead of calling store directly
      window.dispatchEvent(new Event('auth:logout'));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
