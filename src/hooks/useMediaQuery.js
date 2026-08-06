import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries y breakpoints responsive
 * @param {string} query - Media query string (e.g., '(max-width: 768px)')
 * @returns {boolean} - true si la query coincide, false en caso contrario
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    // Inicializar con el valor correcto en SSR y cliente
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    
    // Handler para cambios de media query
    const handler = (e) => {
      setMatches(e.matches);
    };

    // Agregar listener (API nueva es addEventListener, fallback a addListener)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handler);
    } else {
      mediaQueryList.addListener(handler);
    }

    // Cleanup
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handler);
      } else {
        mediaQueryList.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
};

// Breakpoints predefinidos para CampusFlow
export const useBreakpoint = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  return {
    isMobile,     // < 640px (360-640px)
    isTablet,     // < 1024px (640-1024px)
    isDesktop,    // >= 1025px
  };
};
