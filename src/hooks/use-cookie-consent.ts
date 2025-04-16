'use client';

import { useState, useEffect } from 'react';
import {
  CookieSettings,
  defaultCookieSettings,
  hasUserConsent,
  getCookieSettings,
  saveCookieSettings,
  acceptAllCookies,
  acceptNecessaryCookies,
  isCookieAccepted
} from '@/lib/utils/cookies';

/**
 * Hook para gerenciar o consentimento de cookies
 * 
 * @example
 * // Uso básico
 * const { 
 *   hasConsent, 
 *   settings, 
 *   acceptAll, 
 *   acceptOnlyNecessary,
 *   updateSettings,
 *   canUseAnalytics
 * } = useCookieConsent();
 * 
 * // Verificar se pode usar cookies específicos
 * if (canUseAnalytics) {
 *   // Inicializar Google Analytics, por exemplo
 * }
 */
export function useCookieConsent() {
  const [settings, setSettings] = useState<CookieSettings>(defaultCookieSettings);
  const [hasConsent, setHasConsent] = useState(false);

  // Carregar estado inicial
  useEffect(() => {
    setHasConsent(hasUserConsent());
    setSettings(getCookieSettings());
  }, []);

  /**
   * Aceitar todos os tipos de cookies
   */
  const acceptAll = () => {
    acceptAllCookies();
    setSettings({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
    setHasConsent(true);
  };

  /**
   * Aceitar apenas cookies necessários
   */
  const acceptOnlyNecessary = () => {
    acceptNecessaryCookies();
    setSettings(defaultCookieSettings);
    setHasConsent(true);
  };

  /**
   * Atualizar configurações específicas de cookies
   */
  const updateSettings = (newSettings: Partial<CookieSettings>) => {
    const updatedSettings = {
      ...settings,
      ...newSettings,
      necessary: true // Cookies necessários sempre habilitados
    };
    
    saveCookieSettings(updatedSettings);
    setSettings(updatedSettings);
    setHasConsent(true);
  };

  // Propriedades para verificar se tipos específicos de cookies podem ser usados
  const canUseAnalytics = hasConsent && settings.analytics;
  const canUseMarketing = hasConsent && settings.marketing;
  const canUsePreferences = hasConsent && settings.preferences;

  return {
    hasConsent,
    settings,
    acceptAll,
    acceptOnlyNecessary,
    updateSettings,
    canUseAnalytics,
    canUseMarketing,
    canUsePreferences
  };
} 