// API utility functions
import axios from 'axios';
import { apiCache } from './apiCache.js';
import { performanceMonitor } from './performanceMonitor.js';

// Get the API URL with fallback for development
export const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;
  
  if (!apiUrl || apiUrl === 'undefined') {
    // Fallback for local development
    const defaultUrl = 'http://localhost:5001';
    console.warn(`VITE_REACT_APP_API_URL is not set. Using fallback: ${defaultUrl}`);
    console.warn('Please create a .env file in the client directory with:');
    console.warn('VITE_REACT_APP_API_URL=http://localhost:5001');
    return defaultUrl;
  }
  
  return apiUrl;
};

/**
 * Cached GET request - uses cache if available, otherwise fetches and caches
 * @param {string} url - API endpoint URL
 * @param {object} config - Axios config (params, headers, etc.)
 * @param {number} ttl - Optional TTL in milliseconds (overrides default)
 * @returns {Promise} Axios response
 */
export const cachedGet = async (url, config = {}, ttl = null) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  const params = config.params || {};
  
  // Check cache first
  const cached = apiCache.get(fullUrl, params);
  if (cached !== null) {
    console.log(`[ApiCache] Cache HIT for ${fullUrl}`);
    return { data: cached, fromCache: true };
  }

  console.log(`[ApiCache] Cache MISS for ${fullUrl}, fetching...`);
  
  // Monitor API performance
  const monitor = performanceMonitor.monitorApiCall(fullUrl, 'GET');
  monitor.start();
  
  try {
    const response = await axios.get(fullUrl, config);
    monitor.end(response);
    
    // Cache successful responses (only cache 2xx status codes)
    if (response.status >= 200 && response.status < 300) {
      apiCache.set(fullUrl, params, response.data, ttl);
    }
    
    return { ...response, fromCache: false };
  } catch (error) {
    monitor.end(error.response);
    // Don't cache errors
    throw error;
  }
};

/**
 * Regular GET request (no caching) - use for data that changes frequently
 */
export const get = async (url, config = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  const monitor = performanceMonitor.monitorApiCall(fullUrl, 'GET');
  monitor.start();
  
  try {
    const response = await axios.get(fullUrl, config);
    monitor.end(response);
    return response;
  } catch (error) {
    monitor.end(error.response);
    throw error;
  }
};

/**
 * POST request - invalidates related cache entries
 */
export const post = async (url, data = {}, config = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  
  // Invalidate cache for this endpoint
  apiCache.invalidatePattern(fullUrl);
  
  return axios.post(fullUrl, data, config);
};

/**
 * PUT request - invalidates related cache entries
 */
export const put = async (url, data = {}, config = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  
  // Invalidate cache for this endpoint
  apiCache.invalidatePattern(fullUrl);
  
  return axios.put(fullUrl, data, config);
};

/**
 * DELETE request - invalidates related cache entries
 */
export const del = async (url, config = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  
  // Invalidate cache for this endpoint
  apiCache.invalidatePattern(fullUrl);
  
  return axios.delete(fullUrl, config);
};

/**
 * Clear all API cache
 */
export const clearCache = () => {
  apiCache.clear();
};

/**
 * Invalidate cache for a specific endpoint
 */
export const invalidateCache = (url, params = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  apiCache.invalidate(fullUrl, params);
};

// Export axios instance for direct use if needed
export { axios };
