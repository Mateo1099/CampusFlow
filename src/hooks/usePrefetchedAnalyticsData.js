import { useEffect, useState } from 'react';
import {
  prefetchAnalyticsData,
  getAnalyticsDataFromCache,
  clearAnalyticsCache
} from '../lib/prefetchAnalyticsData';

const DEFAULT_ANALYTICS = {
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  totalHabits: 0,
  completedHabits: 0,
  totalMinutes: 0,
  completedBlocks: 0,
  pendingBlocks: 0,
  minutesByDay: [0, 0, 0, 0, 0, 0, 0],
  minutesByTime: {
    morning: 0,
    afternoon: 0,
    night: 0
  },
  historicalSummary: {
    semanaActual: { minutos: 0, bloques: 0 },
    semanaAnterior: { minutos: 0, bloques: 0 },
    diferenciaMinutos: 0,
    diferenciaBloques: 0,
    tendencia: 'stable'
  },
  insights: [],
  recommendations: []
};

/**
 * Hook to use prefetched analytics data
 * First checks cache, then fetches if needed
 * Useful for Stats page that was prefetched to provide instant data
 */
export const usePrefetchedAnalyticsData = (userId) => {
  const [data, setData] = useState(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setData(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // First try to get from cache
    const cached = getAnalyticsDataFromCache(userId);
    if (cached) {
      console.log('[PREFETCHED DATA] Using cached analytics data');
      setData(cached);
      setLoading(false);
      return;
    }

    // If not in cache, fetch it
    console.log('[PREFETCHED DATA] Cache miss for analytics, fetching...');
    prefetchAnalyticsData(userId)
      .then((fetchedData) => {
        setData(fetchedData || DEFAULT_ANALYTICS);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PREFETCHED DATA] Error loading analytics data:', err);
        setError(err);
        setData(DEFAULT_ANALYTICS);
        setLoading(false);
      });
  }, [userId]);

  return {
    ...data,
    loading,
    error,
    clearCache: () => clearAnalyticsCache(userId)
  };
};
