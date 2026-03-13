import { create } from 'zustand';
import {
  authApi,
  setToken,
  removeToken,
  getToken,
  User,
  UserProfile,
  LoginData,
  RegisterData,
  ApiError,
} from '../services/api';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isHydrated: boolean; // True after initial auth check completes
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isHydrated: false,
  isAuthenticated: false,
  error: null,

  login: async (data: LoginData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      await setToken(response.token);
      set({
        user: response.user,
        profile: response.profile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Giriş sırasında bir hata oluştu';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      await setToken(response.token);
      set({
        user: response.user,
        profile: response.profile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Kayıt sırasında bir hata oluştu';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await removeToken();
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, isHydrated: true });
        return;
      }

      const response = await authApi.getMe();
      set({
        user: response.user,
        profile: response.profile,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
      });
    } catch (error) {
      // Token invalid or expired
      await removeToken();
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
