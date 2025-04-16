// Funções utilitárias para lidar com cookies e consentimento LGPD

export type CookieSettings = {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
  
  // Configurações padrão de cookies
  export const defaultCookieSettings: CookieSettings = {
    necessary: true, // Cookies necessários sempre são obrigatórios
    analytics: false,
    marketing: false,
    preferences: false,
  };
  
  /**
   * Verifica se o usuário já deu consentimento para cookies
   */
  export function hasUserConsent(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Verificamos se existe uma entrada específica no localStorage
    const consent = localStorage.getItem('cookieConsent');
    
    // Só retornamos true se o consentimento foi explicitamente dado (valor 'true')
    return consent === 'true';
  }
  
  /**
   * Obtém as configurações de cookies do usuário
   */
  export function getCookieSettings(): CookieSettings {
    if (typeof window === 'undefined') return defaultCookieSettings;
    
    try {
      const settings = localStorage.getItem('cookieSettings');
      if (!settings) return defaultCookieSettings;
      
      return JSON.parse(settings) as CookieSettings;
    } catch (error) {
      console.error('Erro ao obter configurações de cookies:', error);
      return defaultCookieSettings;
    }
  }
  
  /**
   * Salva as configurações de cookies
   */
  export function saveCookieSettings(settings: CookieSettings): void {
    if (typeof window === 'undefined') return;
    
    // Cookies necessários sempre devem estar habilitados
    const newSettings: CookieSettings = {
      ...settings,
      necessary: true,
    };
    
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookieSettings', JSON.stringify(newSettings));
  }
  
  /**
   * Aceita todos os cookies
   */
  export function acceptAllCookies(): void {
    if (typeof window === 'undefined') return;
    
    const allSettings: CookieSettings = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    
    saveCookieSettings(allSettings);
  }
  
  /**
   * Aceita apenas cookies necessários
   */
  export function acceptNecessaryCookies(): void {
    if (typeof window === 'undefined') return;
    
    saveCookieSettings(defaultCookieSettings);
  }
  
  /**
   * Verifica se um tipo específico de cookie foi aceito
   */
  export function isCookieAccepted(type: keyof CookieSettings): boolean {
    if (typeof window === 'undefined') return type === 'necessary';
    
    if (!hasUserConsent()) return type === 'necessary';
    
    const settings = getCookieSettings();
    return settings[type];
  }
  
  /**
   * Limpa o consentimento de cookies (para testes)
   */
  export function clearCookieConsent(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookieSettings');
  } 