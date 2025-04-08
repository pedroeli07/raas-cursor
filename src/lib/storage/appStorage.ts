import { frontendLog as log } from '@/lib/logs/logger';

/**
 * Application Storage Service
 * Centralizes all browser storage operations (localStorage, sessionStorage)
 */
class AppStorage {
  private readonly prefix: string = 'raas_solar_';
  private readonly isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
  }

  // Key generation with prefixing to avoid collisions
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Set a value in storage
   */
  set<T>(key: string, value: T): boolean {
    if (!this.isClient) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serializedValue);
      return true;
    } catch (error) {
      log.error('Failed to set item in storage', { key, error });
      return false;
    }
  }

  /**
   * Get a value from storage
   */
  get<T>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isClient) return defaultValue;
    
    try {
      const value = localStorage.getItem(this.getKey(key));
      if (value === null) return defaultValue;
      return JSON.parse(value) as T;
    } catch (error) {
      log.error('Failed to get item from storage', { key, error });
      return defaultValue;
    }
  }

  /**
   * Remove a value from storage
   */
  remove(key: string): boolean {
    if (!this.isClient) return false;
    
    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      log.error('Failed to remove item from storage', { key, error });
      return false;
    }
  }

  /**
   * Clear all app-specific storage
   */
  clear(): boolean {
    if (!this.isClient) return false;
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      log.error('Failed to clear storage', { error });
      return false;
    }
  }

  // Authentication specific methods

  /**
   * Store authentication token
   */
  setAuthToken(token: string): boolean {
    if (this.isClient) {
      // Também definir o cookie para o middleware
      document.cookie = `auth_token=${token}; path=/; max-age=3600; SameSite=Strict`;
    }
    return this.set('auth_token', token);
  }

  /**
   * Get authentication token
   */
  getAuthToken(): string | null {
    return this.get<string>('auth_token');
  }

  /**
   * Remove authentication token (logout)
   */
  removeAuthToken(): boolean {
    if (this.isClient) {
      // Também remover o cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    return this.remove('auth_token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Store registration data temporarily
   */
  setRegistrationData(data: unknown): boolean {
    return this.set('registration_data', data);
  }

  /**
   * Get registration data
   */
  getRegistrationData(): unknown | null {
    return this.get('registration_data');
  }

  /**
   * Remove registration data
   */
  removeRegistrationData(): boolean {
    return this.remove('registration_data');
  }

  /**
   * Store user profile data
   */
  setUserProfile(data: unknown): boolean {
    return this.set('user_profile', data);
  }

  /**
   * Get user profile data
   */
  getUserProfile(): unknown | null {
    return this.get('user_profile');
  }

  /**
   * Get user role from decoded JWT token
   */
  getUserRole(): string | null {
    const token = this.getAuthToken();
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return payload.role || null;
    } catch (error) {
      log.error('Failed to decode JWT token', { error });
      return null;
    }
  }
}

// Export a singleton instance
const appStorage = new AppStorage();
export default appStorage; 