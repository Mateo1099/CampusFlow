import { plannerService } from './plannerService';
import { coursesService } from './coursesService';
import { prefetchCacheService } from './prefetchCacheService';

/**
 * Fetch weekly planner data needed for the WeeklyPlanner page
 * Extracts planners and courses data
 * 
 * @param {string} userId - User ID
 * @returns {Promise<{ planners: Array, courses: Array }>}
 */
export async function fetchWeeklyPlannerData(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const cacheKey = `weeklyPlanner-${userId}`;

  // Check if data is already cached
  const cached = prefetchCacheService.get(cacheKey);
  if (cached) {
    console.log(`[PREFETCH] Using cached weekly planner data for user ${userId}`);
    return cached;
  }

  console.log(`[PREFETCH] Fetching weekly planner data for user ${userId}`);

  // Fetch both in parallel
  const [planners, courses] = await Promise.all([
    plannerService.getPlanners(userId).catch((err) => {
      console.error('[PREFETCH] Error fetching planners:', err);
      return [];
    }),
    coursesService.getCourses(userId).catch((err) => {
      console.error('[PREFETCH] Error fetching courses:', err);
      return [];
    })
  ]);

  const data = { planners, courses };

  // Store in cache
  prefetchCacheService.set(cacheKey, data);

  return data;
}

/**
 * Prefetch weekly planner data using deduplication
 * Prevents duplicate simultaneous requests
 * 
 * @param {string} userId - User ID
 * @returns {Promise<{ planners: Array, courses: Array }>}
 */
export function prefetchWeeklyPlannerData(userId) {
  if (!userId) return Promise.resolve(null);

  const cacheKey = `weeklyPlanner-${userId}`;

  // Check if already cached
  const cached = prefetchCacheService.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  // Use deduplication to prevent duplicate fetches
  return prefetchCacheService.fetchWithDeduplication(
    cacheKey,
    fetchWeeklyPlannerData(userId)
  );
}

/**
 * Get weekly planner data from cache (no fetch if missing)
 * 
 * @param {string} userId - User ID
 * @returns {{ planners: Array, courses: Array } | null}
 */
export function getWeeklyPlannerDataFromCache(userId) {
  if (!userId) return null;
  const cacheKey = `weeklyPlanner-${userId}`;
  return prefetchCacheService.get(cacheKey);
}

/**
 * Clear weekly planner cache
 * 
 * @param {string} userId - User ID
 */
export function clearWeeklyPlannerCache(userId) {
  if (!userId) return;
  const cacheKey = `weeklyPlanner-${userId}`;
  prefetchCacheService.clear(cacheKey);
}
