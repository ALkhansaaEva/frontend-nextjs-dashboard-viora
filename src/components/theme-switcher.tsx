'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const subscribeToClient = () => () => undefined;

export function useThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);

  const toggleTheme = () => {
    if (mounted) {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
  };

  return {
    theme,
    setTheme,
    resolvedTheme,
    mounted,
    toggleTheme,
    isDark: mounted ? resolvedTheme === 'dark' : false,
  };
}

export default useThemeSwitch;
