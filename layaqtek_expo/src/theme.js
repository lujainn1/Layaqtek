// Design tokens ported from frontend-react/src/index.css (:root and
// :root[data-theme="dark"]). Kept as a flat object per theme so a component
// reads colors the same way the web app reads CSS variables.

const light = {
  primary: '#16a34a',
  primaryLight: '#22c55e',
  primaryBg: 'rgba(22,163,74,0.08)',
  primaryBorder: 'rgba(22,163,74,0.3)',
  accent: '#d97706',
  text: '#0f172a',
  textMuted: '#64748b',
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  surfaceAlt2: '#f1f5f9',
  border: '#e2e8f0',
  protein: '#2563eb',
  carbs: '#d97706',
  fat: '#dc2626',
  danger: '#dc2626',
  dangerBg: 'rgba(220,38,38,0.06)',
  dangerBorder: 'rgba(220,38,38,0.28)',
};

const dark = {
  primary: '#22c55e',
  primaryLight: '#4ade80',
  primaryBg: 'rgba(34,197,94,0.14)',
  primaryBorder: 'rgba(34,197,94,0.4)',
  accent: '#f59e0b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  bg: '#0b1220',
  surface: '#131c2e',
  surfaceAlt: '#1a2436',
  surfaceAlt2: '#1e293b',
  border: '#2b3a52',
  protein: '#60a5fa',
  carbs: '#f59e0b',
  fat: '#f87171',
  danger: '#f87171',
  dangerBg: 'rgba(248,113,113,0.14)',
  dangerBorder: 'rgba(248,113,113,0.4)',
};

export const palettes = { light, dark };

// The four Tajawal weights the web app actually uses.
export const fonts = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  extrabold: 'Tajawal_800ExtraBold',
};

// React Native has no box-shadow; these mirror --shadow-lg closely enough
// and fall back to elevation on Android.
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 6,
  },
};
