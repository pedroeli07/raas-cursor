/**
 * Custom logger utility for RaaS application
 * Provides filtered logging with additional features
 */

import { addConsoleFilters } from './consoleFilter';

// Define log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Track and store if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

/**
 * Add patterns to the console filter
 * @param patterns Array of string or RegExp patterns to filter
 */
export const addLogFilters = (patterns: (string | RegExp)[]) => {
  if (typeof window !== 'undefined') {
    addConsoleFilters(patterns);
  }
};

/**
 * Custom logger with prefixing and conditional output
 */
export const logger = {
  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[RaaS:Debug] ${message}`, ...args);
    }
  },

  /**
   * Log informational messages
   */
  info: (message: string, ...args: any[]) => {
    console.info(`[RaaS:Info] ${message}`, ...args);
  },

  /**
   * Log warning messages
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(`[RaaS:Warn] ${message}`, ...args);
  },

  /**
   * Log error messages
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[RaaS:Error] ${message}`, ...args);
  },

  /**
   * Log backend messages - clearly marked for easier identification
   */
  backend: (level: LogLevel, message: string, ...args: any[]) => {
    const prefix = `[BACKEND:${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        if (isDev) console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }
};

export default logger; 