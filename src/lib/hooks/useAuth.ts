import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { frontendLog as log } from '@/lib/logs/logger';
import appStorage from '@/lib/storage/appStorage';
import { SESSION_MAX_AGE_SECONDS } from '../constants';

// JWT token payload interface
interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// User data interface with optional properties
interface UserData {
  id: string;
  email: string;
  role: string;
  name?: string;
  // Other user properties
}

const maxAgeSeconds = SESSION_MAX_AGE_SECONDS; // 3 days in seconds

/**
 * Authentication hook for handling auth state and operations
 */
export default function useAuth() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();

  /**
   * Decode JWT token and load user data
   */
  const loadUserFromToken = useCallback(() => {
    const token = appStorage.getAuthToken();
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Decode token
      const decoded = jwtDecode<DecodedToken>(token);
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        log.warn('Token expired, logging out user');
        appStorage.removeAuthToken();
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Set user data from token
      setUser({
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
      
      setIsAuthenticated(true);
      
      // Also try to get more detailed user profile from storage
      const storedProfile = appStorage.getUserProfile();
      if (storedProfile) {
        setUser(prev => prev ? { ...prev, ...storedProfile } : null);
      }
      
    } catch (error) {
      log.error('Error decoding token', { error });
      appStorage.removeAuthToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial auth check on mount
  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  /**
   * Login and store token
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      log.debug('Logging in user', { email });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Handle email verification requirement
      if (data.requiresEmailVerification) {
        log.info('Email verification required', { userId: data.userId });
        return {
          success: false,
          requiresEmailVerification: true,
          userId: data.userId
        };
      }
      
      // Handle 2FA requirement
      if (data.requiresTwoFactor) {
        log.info('Two-factor authentication required', { userId: data.userId });
        return {
          success: false,
          requiresTwoFactor: true,
          userId: data.userId
        };
      }
      
      // Normal login with token
      if (data.token) {
        // Armazenar token no localStorage
        appStorage.setAuthToken(data.token);
        
        // Também armazenar em cookie para o middleware (3 days)
        if (typeof document !== 'undefined') {
         
          document.cookie = `auth_token=${data.token}; path=/; max-age=${maxAgeSeconds}; SameSite=Strict`;
        }
        
        loadUserFromToken();
        return { success: true };
      }
      
      throw new Error('No token received from server');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log.error('Login error', { error: errorMessage });
      
      setIsLoading(false);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [loadUserFromToken]);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    appStorage.removeAuthToken();
    appStorage.remove('user_profile');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  }, [router]);

  /**
   * Verify two-factor authentication code
   */
  const verifyTwoFactor = useCallback(async (userId: string, code: string) => {
    setIsLoading(true);
    
    try {
      log.debug('Verifying 2FA code', { userId });
      
      const response = await fetch('/api/auth/verify-two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Two-factor verification failed');
      }
      
      if (data.token) {
        appStorage.setAuthToken(data.token);
        loadUserFromToken();
        return { success: true };
      }
      
      throw new Error('No token received from server');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log.error('Two-factor verification error', { error: errorMessage });
      
      setIsLoading(false);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [loadUserFromToken]);

  /**
   * Get user's role from token
   */
  const getUserRole = useCallback((): string | null => {
    return user?.role || null;
  }, [user]);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role: string | string[]): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    
    return userRole === role;
  }, [getUserRole]);

  /**
   * Update user profile data
   */
  const updateUserProfile = useCallback((profileData: Partial<UserData>) => {
    const currentProfile = appStorage.getUserProfile() || {};
    const updatedProfile = { ...currentProfile, ...profileData };
    
    appStorage.setUserProfile(updatedProfile);
    setUser(prev => prev ? { ...prev, ...profileData } : null);
    
    return updatedProfile;
  }, []);

  return {
    isLoading,
    isAuthenticated,
    user,
    login,
    logout,
    verifyTwoFactor,
    getUserRole,
    hasRole,
    updateUserProfile,
  };
} 