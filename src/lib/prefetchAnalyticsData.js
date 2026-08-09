import { dataStoreService } from './dataStoreService';
import { prefetchCacheService } from './prefetchCacheService';

import { computeAnalytics, DEFAULT_ANALYTICS } from './analyticsService';

/**
 * Fetch analytics data needed for the Stats page
 * NOW uses the unified dataStoreService instead of direct service calls.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Analytics data
 */
export async function fetchAnalyticsData(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const cacheKey = `analytics-${userId}`;

  // Check if data is already cached
  const cached = prefetchCacheService.get(cacheKey);
  if (cached) {
    console.log(`[PREFETCH] Using cached analytics data for user ${userId}`);
    return cached;
  }

  console.log(`[PREFETCH] Fetching analytics data for user ${userId} via dataStore`);

  try {
    // Fetch all data via the unified data store (deduplicates automatically)
    const [tasks, habits, logs, planners] = await Promise.all([
      dataStoreService.getTasks(userId),
      dataStoreService.getHabits(userId),
      dataStoreService.getHabitLogs(userId),
      dataStoreService.getPlanners(userId),
    ]);

    // Compute analytics from fetched data
    const analytics = computeAnalytics(tasks, habits, logs, planners);

    // Store in cache
    prefetchCacheService.set(cacheKey, analytics);

    return analytics;
  } catch (error) {
    console.error('[PREFETCH] Error in fetchAnalyticsData:', error);
    return DEFAULT_ANALYTICS;
  }
}

/**
 * Prefetch analytics data using deduplication
 * Prevents duplicate simultaneous requests
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export function prefetchAnalyticsData(userId) {
  if (!userId) return Promise.resolve(DEFAULT_ANALYTICS);

  const cacheKey = `analytics-${userId}`;

  // Check if already cached
  const cached = prefetchCacheService.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  // Use deduplication to prevent duplicate fetches
  return prefetchCacheService.fetchWithDeduplication(
    cacheKey,
    fetchAnalyticsData(userId)
  );
}

/**
 * Get analytics data from cache (no fetch if missing)
 * 
 * @param {string} userId - User ID
 * @returns {Object | null}
 */
export function getAnalyticsDataFromCache(userId) {
  if (!userId) return null;
  const cacheKey = `analytics-${userId}`;
  return prefetchCacheService.get(cacheKey);
}

/**
 * Clear analytics cache
 * 
 * @param {string} userId - User ID
 */
export function clearAnalyticsCache(userId) {
  if (!userId) return;
  const cacheKey = `analytics-${userId}`;
  prefetchCacheService.clear(cacheKey);
}
