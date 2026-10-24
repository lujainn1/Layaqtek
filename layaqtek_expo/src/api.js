// All backend API calls — ported from frontend-react/src/api.js.
// The backend is unchanged (Node.js/Express on port 3001).
//
// One shape change from the web version: native storage is async, so the
// accessors below return Promises. This matches layaqtek_app/lib/api.dart,
// where the same methods return Futures.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { router } from 'expo-router';

const TOKEN_KEY = 'layaqtek_token';
const USER_KEY = 'layaqtek_user';

// The web app derives this from window.location. On device there is no origin,
// so it comes from the environment instead — the equivalent of Flutter's
// --dart-define=API_BASE_URL. Set EXPO_PUBLIC_API_BASE_URL in .env.local to
// point at your LAN IP or the deployed backend.
//
//   Android emulator          -> http://10.0.2.2:3001 (default)
//   iOS simulator            -> http://localhost:3001 (default)
//   physical phone, same Wi-Fi -> http://YOUR_PC_IP:3001
//   deployed                 -> https://layaqtek.vercel.app
const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  DEFAULT_BASE_URL;

// expo-secure-store is not implemented on web; fall back there so
// `npm run web` still runs. Native keeps the JWT in the keychain/keystore,
// which is an upgrade over shared_preferences in the Flutter app.
const secure = {
  async get(key) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export async function getToken() {
  try {
    return await secure.get(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return !!(await getToken());
}

export async function saveAuth(token, user) {
  await secure.set(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function updateStoredUser(patch) {
  const user = (await getUser()) || {};
  const next = { ...user, ...patch };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}

export async function clearAuth() {
  await secure.remove(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    // fetch rejects on a dropped connection, which the web app never had to
    // handle — a phone on Wi-Fi does.
    throw new Error('تعذّر الاتصال بالخادم. تحقّق من الشبكة.');
  }

  if (response.status === 401 && token) {
    await clearAuth();
    router.replace('/login');
    throw new Error('جلسة منتهية');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `خطأ في الخادم (${response.status})`);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────
export const apiLogin = (email, password) =>
  apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const apiRegister = (name, email, password) =>
  apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });

export const apiForgotPassword = (email) =>
  apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });

export const apiResetPassword = (email, token, password) =>
  apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, token, password }) });

export const apiSaveProfile = (gender, age, weight, height, activityLevel, goal) =>
  apiFetch('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ gender, age, weight, height, activityLevel, goal }),
  });

export const apiUpdateGoals = (calories, protein, carbs, fat, water) =>
  apiFetch('/api/auth/goals', {
    method: 'PUT',
    body: JSON.stringify({ calories, protein, carbs, fat, water }),
  });

// ── Food ──────────────────────────────────────────────────────
export const apiSearchFood = (query) => apiFetch(`/api/food/search?q=${encodeURIComponent(query)}`);
export const apiGetAllFoods = () => apiFetch('/api/food/all');
export const apiGetLog = (date) => apiFetch(`/api/food/log/${date}`);
export const apiSaveLog = (date, meals, water) =>
  apiFetch(`/api/food/log/${date}`, { method: 'POST', body: JSON.stringify({ meals, water }) });
export const apiGetStats = (days = 7) => apiFetch(`/api/food/stats?days=${days}`);

// ── AI ────────────────────────────────────────────────────────
export const apiAnalyzeImage = (imageData, mimeType) =>
  apiFetch('/api/ai/analyze', { method: 'POST', body: JSON.stringify({ imageData, mimeType }) });
