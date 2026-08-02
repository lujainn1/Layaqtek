// All backend API calls — mirrors the vanilla js/api.js exactly.
// No API keys here; AI calls are proxied through the backend.

const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : '';

export function getToken() {
  return localStorage.getItem('layaqtek_token');
}

export function getUser() {
  try {
    const raw = localStorage.getItem('layaqtek_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getToken();
}

export function saveAuth(token, user) {
  localStorage.setItem('layaqtek_token', token);
  localStorage.setItem('layaqtek_user', JSON.stringify(user));
}

export function updateStoredUser(patch) {
  const user = getUser() || {};
  const next = { ...user, ...patch };
  localStorage.setItem('layaqtek_user', JSON.stringify(next));
  return next;
}

export function clearAuth() {
  localStorage.removeItem('layaqtek_token');
  localStorage.removeItem('layaqtek_user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login';
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
