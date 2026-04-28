import { useEffect, useState } from 'react';
import {
  prefetchWeeklyPlannerData,
  getWeeklyPlannerDataFromCache,
  clearWeeklyPlannerCache
} from '../lib/prefetchWeeklyPlannerData';

/**
 * Hook to use prefetched weekly planner data
 * First checks cache, then fetches if needed
 * Useful for pages that were prefetched to provide instant data
 */
export const usePrefetchedWeeklyPlannerData = (userId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // First try to get from cache
    const cached = getWeeklyPlannerDataFromCache(userId);
    if (cached) {
      console.log('[PREFETCHED DATA] Using cached weekly planner data');
      setData(cached);
      setLoading(false);
      return;
    }

    // If not in cache, fetch it
    console.log('[PREFETCHED DATA] Cache miss for weekly planner, fetching...');
    prefetchWeeklyPlannerData(userId)
      .then((fetchedData) => {
        setData(fetchedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PREFETCHED DATA] Error loading weekly planner data:', err);
        setError(err);
        setLoading(false);
      });
  }, [userId]);

  return {
    planners: data?.planners || [],
    courses: data?.courses || [],
    loading,
    error,
    clearCache: () => clearWeeklyPlannerCache(userId)
  };
};
