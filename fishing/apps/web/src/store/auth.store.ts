import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  role?: string;
  profileImage?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  authReady: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User> & { id?: string }) => void;
  restoreTokens: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoggedIn: false,
  authReady: false,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, isLoggedIn: true, authReady: true });
  },

  updateUser: (partial) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : state.user,
    }));
  },

  restoreTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ accessToken, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, isLoggedIn: false, authReady: true });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ authReady: true });
      return;
    }

    set({ accessToken: token, isLoggedIn: true });

    try {
      const res = await api.get('/users/me');
      set({
        user: res.data.data,
        accessToken: token,
        isLoggedIn: true,
        authReady: true,
      });
    } catch {
      if (!localStorage.getItem('refreshToken')) {
        get().logout();
      } else {
        set({ authReady: true });
      }
    }
  },
}));
