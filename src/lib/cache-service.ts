/**
 * Simple in-memory cache service for the RaaS Solar platform
 * Provides caching to reduce API calls and improve performance
 */

import { createLogger } from './utils/logger';

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private logger = createLogger('CacheService');

  constructor() {
    this.logger.info('Cache service initialized');
    
    // Clean up expired items every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
    }
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value, or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      this.logger.debug(`Cache miss: ${key}`);
      return undefined;
    }
    
    // Check if item is expired
    if (Date.now() > item.expiresAt) {
      this.logger.debug(`Cache expired: ${key}`);
      this.cache.delete(key);
      return undefined;
    }
    
    this.logger.debug(`Cache hit: ${key}`);
    return item.value as T;
  }

  /**
   * Set a value in the cache with expiration
   * @param key The cache key
   * @param value The value to cache
   * @param minutes Minutes until the cache entry expires
   */
  set<T>(key: string, value: T, minutes = 60): void {
    this.logger.debug(`Cache set: ${key}, expires in ${minutes} minutes`);
    
    const expiresAt = Date.now() + (minutes * 60 * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  /**
   * Remove an item from the cache
   * @param key The cache key
   */
  remove(key: string): void {
    this.logger.debug(`Cache remove: ${key}`);
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.logger.debug('Cache clear');
    this.cache.clear();
  }

  /**
   * Clean expired items from the cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    let removedCount = 0;
    
    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      this.logger.debug(`Cleaned ${removedCount} expired cache items`);
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService; 