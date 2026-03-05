import { create } from 'zustand';
import api from '@/api/axios';

const useAuthStore = create((set) => ({
  user:  JSON.parse(localStorage.getItem('busgo_user') || 'null'),
  token: localStorage.getItem('busgo_token') || null,

  login: (data) => {
    localStorage.setItem('busgo_token', data.token);
    localStorage.setItem('busgo_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem('busgo_token');
    localStorage.removeItem('busgo_user');
    set({ user: null, token: null });
  },

  // Called on app mount — verifies token with server and refreshes user data
  initialize: async () => {
    const token = localStorage.getItem('busgo_token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        localStorage.setItem('busgo_user', JSON.stringify(data.data));
        set({ token, user: data.data });
      }
    } catch {
      localStorage.removeItem('busgo_token');
      localStorage.removeItem('busgo_user');
      set({ user: null, token: null });
    }
  },

  setUser: (user) => {
    localStorage.setItem('busgo_user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
