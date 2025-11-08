import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from localStorage or default to 'dark'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('codfence-theme') as Theme | null;
      return saved || 'dark';
    }
    return 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    }
    return 'dark';
  });

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return;

    let actualTheme: 'light' | 'dark';
    
    if (newTheme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = newTheme;
    }

    // Apply to document
    document.documentElement.setAttribute('data-theme', actualTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(actualTheme);
    
    setResolvedTheme(actualTheme);
    
    // Save to localStorage
    localStorage.setItem('codfence-theme', newTheme);
  }, []);

  // Set theme and apply it
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') {
      // If not system, apply the theme directly
      applyTheme(theme);
      return;
    }

    // If system, listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const actualTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', actualTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(actualTheme);
      setResolvedTheme(actualTheme);
    };

    // Apply initial system theme
    applyTheme('system');

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

