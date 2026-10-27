'use client';

import React, { createContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'viora-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {}
  return 'system';
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  const isDark = resolvedTheme === 'dark';

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark,
  }), [theme, resolvedTheme, setTheme, toggleTheme, isDark]);

  useEffect(() => {
    applyTheme(resolvedTheme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handler = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useVioraTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'system' as Theme,
      resolvedTheme: 'light' as const,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
    };
  }
  return context;
}
