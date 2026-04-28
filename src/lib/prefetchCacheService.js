/**
 * In-memory cache for prefetched data
 * Stores data for WeeklyPlanner and Stats pages to enable instant navigation
 */

const cache = new Map();
const fetchingPromises = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export const prefetchCacheService = {
  /**
   * Get cached data
   * @param {string} key - Cache key (e.g., 'weeklyPlanner-userId', 'analytics-userId')
   * @returns {any | null} - Cached data or null if expired/missing
   */
  get(key) {
    const entry = cache.get(key);
    if (!entry) return null;

    // Check if cache has expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }

    console.log(`[CACHE HIT] ${key}`);
    return entry.data;
  },

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  set(key, data) {
    console.log(`[CACHE SET] ${key}`);
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key
   */
  clear(key) {
    cache.delete(key);
    console.log(`[CACHE CLEARED] ${key}`);
  },

  /**
   * Clear all cache entries
   */
  clearAll() {
    cache.clear();
    console.log(`[CACHE CLEARED ALL]`);
  },

  /**
   * Start a fetch operation (prevents duplicate requests)
   * @param {string} key - Cache key
   * @param {Promise} fetchPromise - Promise that fetches the data
   * @returns {Promise} - Resolves when fetch is complete
   */
  async fetchWithDeduplication(key, fetchPromise) {
    // If already fetching this key, return existing promise
    if (fetchingPromises.has(key)) {
      console.log(`[FETCH DEDUP] Reusing existing fetch for ${key}`);
      return fetchingPromises.get(key);
    }

    // Start new fetch and cache the promise
    const promise = fetchPromise
      .then((data) => {
        this.set(key, data);
        return data;
      })
      .catch((error) => {
        console.error(`[FETCH ERROR] ${key}:`, error);
        fetchingPromises.delete(key);
        throw error;
      })
      .finally(() => {
        fetchingPromises.delete(key);
      });

    fetchingPromises.set(key, promise);
    return promise;
  },

  /**
   * Get cache status for debugging
   */
  getStatus() {
    return {
      entriesCount: cache.size,
      fetchingCount: fetchingPromises.size,
      entries: Array.from(cache.keys()),
      fetching: Array.from(fetchingPromises.keys())
    };
  }
};
