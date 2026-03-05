import { create } from 'zustand';

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

  // Called on app mount to sync store from localStorage
  initialize: () => {
    const token = localStorage.getItem('busgo_token');
    const userStr = localStorage.getItem('busgo_user');
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
      } catch {
        localStorage.removeItem('busgo_token');
        localStorage.removeItem('busgo_user');
      }
    }
  },

  // Used by Task 7 to update user profile after /auth/me fetch
  setUser: (user) => {
    localStorage.setItem('busgo_user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
