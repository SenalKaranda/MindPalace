/**
 * Simple in-memory cache for API responses with TTL (Time To Live) support
 * Also supports persistent caching in localStorage for cross-session persistence
 */

class ApiCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // Default: 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.persistentCache = true; // Enable localStorage persistence
    this.maxCacheSize = 100; // Maximum number of cached items
  }

  /**
   * Generate a cache key from URL and params
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${url}${sortedParams ? `?${sortedParams}` : ''}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(url, params = {}) {
    const key = this.generateKey(url, params);
    const cached = this.cache.get(key);

    if (!cached) {
      // Try loading from localStorage if persistent cache is enabled
      if (this.persistentCache) {
        try {
          const stored = localStorage.getItem(`apiCache_${key}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Check if still valid
            if (parsed.expiresAt > Date.now()) {
              this.cache.set(key, parsed);
              return parsed.data;
            } else {
              // Expired, remove from localStorage
              localStorage.removeItem(`apiCache_${key}`);
            }
          }
        } catch (error) {
          console.warn('[ApiCache] Error reading from localStorage:', error);
        }
      }
      return null;
    }

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      if (this.persistentCache) {
        try {
          localStorage.removeItem(`apiCache_${key}`);
        } catch (error) {
          // Ignore localStorage errors
        }
      }
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached response with optional TTL
   */
  set(url, params = {}, data, ttl = null) {
    const key = this.generateKey(url, params);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    const cacheEntry = {
      data,
      expiresAt,
      cachedAt: Date.now()
    };

    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      if (this.persistentCache) {
        try {
          localStorage.removeItem(`apiCache_${firstKey}`);
        } catch (error) {
          // Ignore
        }
      }
    }

    this.cache.set(key, cacheEntry);

    // Persist to localStorage if enabled
    if (this.persistentCache) {
      try {
        // Only store if data is serializable and not too large
        const serialized = JSON.stringify(cacheEntry);
        if (serialized.length < 5 * 1024 * 1024) { // 5MB limit
          localStorage.setItem(`apiCache_${key}`, serialized);
        }
      } catch (error) {
        // If localStorage is full or data too large, just use in-memory cache
        console.warn('[ApiCache] Could not persist to localStorage:', error);
      }
    }
  }

  /**
   * Invalidate cache for a specific URL/params
   */
  invalidate(url, params = {}) {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
    if (this.persistentCache) {
      try {
        localStorage.removeItem(`apiCache_${key}`);
      } catch (error) {
        // Ignore
      }
    }
  }

  /**
   * Invalidate all cache entries matching a URL pattern
   */
  invalidatePattern(urlPattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(urlPattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      if (this.persistentCache) {
        try {
          localStorage.removeItem(`apiCache_${key}`);
        } catch (error) {
          // Ignore
        }
      }
    });
  }

  /**
   * Clear all cache
   */
  clear() {
    if (this.persistentCache) {
      try {
        // Clear all localStorage cache entries
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('apiCache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('[ApiCache] Error clearing localStorage cache:', error);
      }
    }
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      persistent: this.persistentCache
    };
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

// Export class for custom instances if needed
export default ApiCache;
