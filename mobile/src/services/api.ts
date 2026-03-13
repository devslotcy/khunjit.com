import * as SecureStore from 'expo-secure-store';

/**
 * API Base URL Configuration
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL environment variable
 * 2. Fallback based on __DEV__ mode
 *
 * For local development on real devices:
 * - Find your computer's LAN IP (e.g., 192.168.1.x)
 * - Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:5000 in .env
 * - Or update the DEV_FALLBACK_URL below
 *
 * Note: EXPO_PUBLIC_* env vars are automatically available in Expo SDK 49+
 */
const DEV_FALLBACK_URL = 'http://localhost:5055';
const PROD_URL = 'https://khunjit.com';

// Expo automatically exposes EXPO_PUBLIC_* env vars
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ ? DEV_FALLBACK_URL : PROD_URL);

const TOKEN_KEY = 'auth_token';

// Callback for global 401 handling - set by auth store
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

// Token management
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

// API Request helper
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  skipUnauthorizedHandler?: boolean; // Skip 401 handling for specific requests
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    requireAuth = false,
    skipUnauthorizedHandler = false,
  } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requireAuth) {
    const token = await getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Global 401 handling - token expired or invalid
  if (response.status === 401 && !skipUnauthorizedHandler) {
    await removeToken();
    if (onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError('Oturum suresi doldu. Lutfen tekrar giris yapin.', 401);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP error ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

// API Error class
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Auth API
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  role: 'patient' | 'psychologist' | 'admin';
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  city?: string | null;
  profession?: string | null;
  bio?: string | null;
}

export interface AuthResponse {
  user: User;
  profile: UserProfile;
  token: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'psychologist';
  phone?: string;
  birthDate?: string;
  gender?: string;
  city?: string;
  profession?: string;
  bio?: string;
  // Psychologist-specific fields
  title?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  education?: string;
  specialties?: string[];
  therapyApproaches?: string[];
  languages?: string[];
  pricePerSession?: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterData) =>
    apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),

  login: (data: LoginData) =>
    apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: data,
    }),

  getMe: () =>
    apiRequest<{ user: User; profile: UserProfile }>('/api/auth/me', {
      requireAuth: true,
    }),
};
