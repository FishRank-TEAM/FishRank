import { create } from 'zustand';
import { api } from '@/lib/api';
import { clearTokens, getAccessToken, setTokens } from '@/lib/storage';

type User = {
  id: string;
  email: string;
  nickname: string;
  role?: string;
  profileImage?: string | null;
};

type AuthState = {
  isLoggedIn: boolean;
  authReady: boolean;
  user: User | null;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  authReady: false,
  user: null,

  login: async (accessToken, refreshToken, user) => {
    await setTokens(accessToken, refreshToken);
    set({ isLoggedIn: true, user });
  },

  logout: async () => {
    await clearTokens();
    set({ isLoggedIn: false, user: null });
  },

  setUser: (user) => set({ user }),

  bootstrap: async () => {
    const token = await getAccessToken();
    if (!token) {
      set({ isLoggedIn: false, authReady: true, user: null });
      return;
    }
    try {
      const me = await api.get('/users/me');
      set({
        isLoggedIn: true,
        authReady: true,
        user: {
          id: me.data.data.id,
          email: me.data.data.email,
          nickname: me.data.data.nickname,
          role: me.data.data.role,
          profileImage: me.data.data.profileImage,
        },
      });
    } catch {
      await clearTokens();
      set({ isLoggedIn: false, authReady: true, user: null });
    }
  },
}));
