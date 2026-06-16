/**
 * api.js - All backend API calls
 * IMPORTANT: No API keys here. All AI calls go through the backend proxy.
 */

const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : '';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('layaqtek_token');
}

function getUser() {
  try {
    const raw = localStorage.getItem('layaqtek_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return !!getToken();
}

function clearAuth() {
  localStorage.removeItem('layaqtek_token');
  localStorage.removeItem('layaqtek_user');
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Redirect to login if unauthenticated
  if (response.status === 401) {
    clearAuth();
    window.location.href = 'login.html';
    throw new Error('جلسة منتهية');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `خطأ في الخادم (${response.status})`);
  }

  return data;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
async function apiLogin(email, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function apiRegister(name, email, password) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

// ── Food endpoints ────────────────────────────────────────────────────────────
async function apiSearchFood(query) {
  return apiFetch(`/api/food/search?q=${encodeURIComponent(query)}`);
}

async function apiGetAllFoods() {
  return apiFetch('/api/food/all');
}

async function apiGetLog(date) {
  return apiFetch(`/api/food/log/${date}`);
}

async function apiSaveLog(date, meals, water) {
  return apiFetch(`/api/food/log/${date}`, {
    method: 'POST',
    body: JSON.stringify({ meals, water }),
  });
}

// ── Profile endpoint ──────────────────────────────────────────────────────────
async function apiSaveProfile(gender, age, weight, height, activityLevel, goal) {
  return apiFetch('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ gender, age, weight, height, activityLevel, goal }),
  });
}

async function apiUpdateGoals(calories, protein, carbs, fat, water) {
  return apiFetch('/api/auth/goals', {
    method: 'PUT',
    body: JSON.stringify({ calories, protein, carbs, fat, water }),
  });
}

async function apiGetStats(days = 7) {
  return apiFetch(`/api/food/stats?days=${days}`);
}

// ── AI endpoint ───────────────────────────────────────────────────────────────
// Image is sent as base64 to the backend, which then proxies to Claude.
// The Anthropic API key is NEVER exposed to the frontend.
async function apiAnalyzeImage(imageData, mimeType) {
  return apiFetch('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageData, mimeType }),
  });
}
