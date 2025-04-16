import { NextRequest } from 'next/server';
import { RequestUser } from '../types/types';
import { jwtVerify, JWTPayload } from 'jose';
import log from '../logs/logger';
import { verify } from 'jsonwebtoken';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { $Enums } from '@prisma/client';

// Define the Role enum
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ADMIN_STAFF = 'ADMIN_STAFF',
  CUSTOMER = 'CUSTOMER',
  ENERGY_RENTER = 'ENERGY_RENTER',
  USER = 'USER'
}

/**
 * Merges multiple class names into a single string, handling conflicts appropriately.
 * Uses clsx for conditional classes and tailwind-merge to resolve Tailwind CSS conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 
/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + "..."
  }

/**
 * Date and Time Utils
 */

// Format date to ISO string (YYYY-MM-DD)
export function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  // Add days to a date
  export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  // Check if a date is in the past
  export function isPastDate(date: Date): boolean {
    return date < new Date();
  }

/**
 * Format a date with localization support
 */
export function formatDatePtBr(
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    locale = "pt-BR"
  ) {
    return new Intl.DateTimeFormat(locale, options).format(
      typeof date === "string" ? new Date(date) : date
    )
  }

  /**
 * Calculates the difference between two dates in days
 */
export function daysBetweenDates(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

/**
 * Formats a date for display in Portuguese
 */
export function formatDateWithTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }


/**
 * JWT and Authentication Utils
 */

// Interface para o payload do JWT ampliando o JWTPayload
interface CustomJWTPayload extends JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

// Extract user info from request headers (set by middleware)
export function getUserFromRequest(req: NextRequest): RequestUser {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, userEmail: null, userRole: null };
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const secret = process.env.JWT_SECRET || 'default_secret_unsafe';
    const decoded = verify(token, secret) as CustomJWTPayload;
    
    return {
      userId: decoded.userId,
      userEmail: decoded.email,
      userRole: decoded.role as $Enums.Role | null
    };
  } catch {
    log.warn('Invalid JWT token in request');
    return { userId: null, userEmail: null, userRole: null };
  }
}

// Verify if user has admin privileges
export function isAdmin(role: Role | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

// Verify if user is super admin
export function isSuperAdmin(role: Role | null | undefined): boolean {
  return role === 'SUPER_ADMIN';
}

// Extract JWT token from Authorization header
export function extractTokenFromHeader(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Verify JWT token
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(new TextEncoder().encode(token), new TextEncoder().encode(secret));
    return payload;
  } catch {
    log.error('JWT verification failed');
    return null;
  }
}


/**
 * String Utils
 */

// Generate a random string of specified length
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Mask sensitive data (e.g., email) for logging
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}${'*'.repeat(name.length - 2)}@${domain}`;
}

/**
 * Object Utils
 */

// Remove sensitive fields from an object
export function removeSensitiveData<T extends Record<string, unknown>>(
  obj: T, 
  sensitiveFields: string[]
): Partial<T> {
  const result = { ...obj };
  sensitiveFields.forEach(field => {
    if (field in result) {
      delete result[field];
    }
  });
  return result;
}

// Convert snake_case to camelCase
export function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, group => 
    group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

// Convert object keys from snake_case to camelCase
export function convertKeysToCamel<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  
  Object.keys(obj).forEach(key => {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    
    result[camelKey] = value && typeof value === 'object' && !Array.isArray(value)
      ? convertKeysToCamel(value as Record<string, unknown>)
      : value;
  });
  
  return result as T;
}



/**
 * Generates a random invite token
 */
export function generateInviteToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Formats a value in reais
 */
export function formatCurrencyPtBr(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}



/**
 * Formats a value in kWh
 */
export function formatEnergy(value: number): string {
  return `${value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} kWh`;
}

/**
 * Formats a value as a percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toLocaleString('pt-BR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}%`;
}

/**
 * Checks if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const secret = process.env.JWT_SECRET || 'default_secret_unsafe';
    const decoded = verify(token, secret) as CustomJWTPayload;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return typeof decoded.exp === 'number' && decoded.exp < currentTime;
  } catch {
    return true; // Se não conseguir decodificar, consideramos expirado
  }
}

/**
 * Extract initials from a name
 */
export function getInitials(name: string): string {
    if (!name) return ""
    
    const parts = name.split(" ").filter(Boolean)
    
    if (parts.length === 0) return ""
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  
  /**
   * Debounce a function
   */
  export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null
    
    return function(...args: Parameters<T>) {
      if (timeout) clearTimeout(timeout)
      
      timeout = setTimeout(() => {
        func(...args)
      }, wait)
    }
  }
  
  /**
   * Throttle a function
   */
  export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false
    
    return function(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => {
          inThrottle = false
        }, limit)
      }
    }
  }
  
/**
 * Checks if the user role is ADMIN or SUPER_ADMIN.
 * @param role - The user role.
 * @returns True if the role is ADMIN or SUPER_ADMIN, false otherwise.
 */
export function isAdminOrSuperAdmin(role: Role | null): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}
  



/**
 * Obtém a duração de expiração do token de autenticação em segundos (client-side)
 * @returns {Promise<number>} Duração em segundos
 */
export async function getTokenExpirySeconds(): Promise<number> {
  try {
    const response = await fetch('/api/settings?key=AUTH_TOKEN_EXPIRY_HOURS');
    
    if (!response.ok) {
      console.error('Erro ao buscar duração do token:', response.statusText);
      return 24 * 60 * 60; // 24 horas em segundos (padrão)
    }
    
    const data = await response.json();
    const expiryHours = parseInt(data.value, 10);
    
    if (isNaN(expiryHours) || expiryHours <= 0) {
      console.error('Valor inválido para expiração do token:', data.value);
      return 24 * 60 * 60; // 24 horas em segundos (padrão)
    }
    
    return expiryHours * 60 * 60; // Converter horas para segundos
  } catch (error) {
    console.error('Erro ao buscar duração do token:', error);
    return 24 * 60 * 60; // 24 horas em segundos (padrão)
  }
}

/**
 * Formata um valor monetário em Real brasileiro (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata uma data usando o formato Brasileiro
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  try {
    // Handle string dates by converting to Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      console.error('[formatDate] Invalid date value:', date);
      return '-';
    }
    
    return new Intl.DateTimeFormat("pt-BR").format(dateObj);
  } catch (error) {
    console.error('[formatDate] Error formatting date:', error, date);
    return '-';
  }
}

/**
 * Formats file size in bytes to a human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Helper to get user ID from request headers (set by middleware)
export function getUserIdFromRequest(req: NextRequest): string | null {
  return req.headers.get('x-user-id');
}

/**
 * Create a web worker for heavy calculations
 * @param workerCode - The code to be executed in the worker
 * @returns Worker object or null if creation failed
 */
export const createWorker = (workerCode: string): Worker | null => {
  if (typeof window === 'undefined' || !window.Worker) {
    return null;
  }
  
  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    // Ensure URL is revoked when worker is terminated
    const originalTerminate = worker.terminate;
    worker.terminate = function() {
      URL.revokeObjectURL(workerUrl);
      return originalTerminate.call(this);
    };
    
    return worker;
  } catch (error) {
    console.error('Error creating worker:', error);
    return null;
  }
}; 