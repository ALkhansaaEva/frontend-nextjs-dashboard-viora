'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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