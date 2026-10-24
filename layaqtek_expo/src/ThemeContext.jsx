// Ported from frontend-react/src/context/ThemeContext.jsx.
// localStorage -> AsyncStorage (async, so the stored preference is read in an
// effect rather than in the initial state), and matchMedia -> useColorScheme.

import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, fonts, shadows } from './theme';

const THEME_KEY = 'layaqtek_theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [stored, setStored] = useState(undefined); // undefined = not read yet

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((value) => setStored(value === 'light' || value === 'dark' ? value : null))
      .catch(() => setStored(null));
  }, []);

  // Follow the system until the user picks a theme explicitly — same rule as
  // the web app and the Flutter app's ThemeMode.system default.
  const theme = stored ?? (systemScheme === 'dark' ? 'dark' : 'light');

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setStored(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  }

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, colors: palettes[theme], fonts, shadows }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
