'use client';

import { useState, useEffect } from 'react';

/**
 * Hook personalizado para detectar media queries
 * @param query A media query a ser verificada (ex: '(max-width: 768px)')
 * @returns Boolean indicando se a media query corresponde
 */
export function useMediaQuery(query: string): boolean {
  // Estado inicializado como null para evitar incompatibilidade de hidratação
  const [matches, setMatches] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Verificamos se window está disponível (client-side)
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      
      // Definir o estado inicial
      setMatches(media.matches);
      
      // Definir um listener para mudanças
      const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
      
      // Adicionar o listener
      if (media.addEventListener) {
        media.addEventListener('change', listener);
      } else {
        // Fallback para browsers mais antigos
        media.addListener(listener);
      }
      
      // Cleanup: remover o listener
      return () => {
        if (media.removeEventListener) {
          media.removeEventListener('change', listener);
        } else {
          // Fallback para browsers mais antigos
          media.removeListener(listener);
        }
      };
    }
  }, [query]);

  // Durante SSR ou antes da montagem, retornamos um valor padrão
  // Isto evita problemas de hidratação
  if (!mounted) return false;

  return matches;
} 