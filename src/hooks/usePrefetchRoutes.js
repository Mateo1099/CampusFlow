import { useEffect, useRef } from 'react';
import { prefetchWeeklyPlannerData } from '../lib/prefetchWeeklyPlannerData';
import { prefetchAnalyticsData } from '../lib/prefetchAnalyticsData';

/**
 * Intelligent route prefetching hook
 * Preloads heavy pages (TaskBoard, WeeklyPlanner, Stats) after authentication and during idle time
 * Prefetches both component code and data to enable instant navigation
 * Improves perceived navigation speed without blocking the main app
 */
export const usePrefetchRoutes = (isAuthenticated, userId) => {
  const alreadyPrefetchedRef = useRef('');

  useEffect(() => {
    const perfLog = (event, payload = {}) => {
      const ts = performance.now();
      const entry = { event, ts, ...payload };
      if (typeof window !== 'undefined') {
        window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
        window.__CF_PERF_LOGS.push(entry);
      }
      console.log('[PERF]', entry);
    };

    // Only prefetch after user is authenticated and app is idle
    if (!isAuthenticated || !userId) return;

    const prefetchKey = `route-prefetch:${userId}`;
    if (alreadyPrefetchedRef.current === prefetchKey) {
      perfLog('prefetch_guard_skip', { userId, reason: 'already-prefetched' });
      return;
    }
    alreadyPrefetchedRef.current = prefetchKey;

    const prefetchStartTs = performance.now();
    perfLog('prefetch_schedule_start', { userId });

    // Determine if requestIdleCallback is available (modern browsers)
    const schedulePreload = (callback) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 3000 });
      } else {
        // Fallback: use setTimeout with slight delay
        setTimeout(callback, 2000);
      }
    };

    // Schedule prefetch during idle time
    const prefetchHandle = schedulePreload(() => {
      perfLog('prefetch_run_start', {
        userId,
        delayMs: Number((performance.now() - prefetchStartTs).toFixed(2))
      });

      // Array of heavy page modules to prefetch
      const routesToPrefetch = [
        {
          name: 'TaskBoard',
          loader: () => import('../pages/TaskBoard'),
        },
        {
          name: 'WeeklyPlanner',
          loader: () => import('../pages/WeeklyPlanner'),
        },
        {
          name: 'Stats',
          loader: () => import('../pages/Stats'),
        },
        {
          name: 'Pomodoro',
          loader: () => import('../pages/Pomodoro'),
        },
        {
          name: 'Agenda',
          loader: () => import('../pages/Agenda'),
        },
      ];

      // Prefetch component code (don't await, let them load in background)
      routesToPrefetch.forEach(({ name, loader }) => {
        const componentStart = performance.now();
        loader()
          .then(() => {
            console.log(`[PREFETCH] ✓ Preloaded component: ${name}`);
            perfLog('prefetch_component_done', {
              name,
              durationMs: Number((performance.now() - componentStart).toFixed(2))
            });
          })
          .catch((err) => {
            console.warn(`[PREFETCH] Failed to preload component ${name}:`, err);
            perfLog('prefetch_component_error', { name, message: err?.message || String(err) });
          });
      });

      // Prefetch data for heavy pages
      console.log(`[PREFETCH] Starting data prefetch for user ${userId}`);
      
      // Prefetch WeeklyPlanner data
      prefetchWeeklyPlannerData(userId)
        .then(() => {
          console.log(`[PREFETCH] ✓ Preloaded data: WeeklyPlanner`);
          perfLog('prefetch_weeklyplanner_data_done', {
            durationMs: Number((performance.now() - prefetchStartTs).toFixed(2))
          });
        })
        .catch((err) => {
          console.warn(`[PREFETCH] Failed to preload WeeklyPlanner data:`, err);
          perfLog('prefetch_weeklyplanner_data_error', { message: err?.message || String(err) });
        });

      // Prefetch Stats/Analytics data
      prefetchAnalyticsData(userId)
        .then(() => {
          console.log(`[PREFETCH] ✓ Preloaded data: Stats`);
          perfLog('prefetch_analytics_data_done', {
            durationMs: Number((performance.now() - prefetchStartTs).toFixed(2))
          });
        })
        .catch((err) => {
          console.warn(`[PREFETCH] Failed to preload Stats data:`, err);
          perfLog('prefetch_analytics_data_error', { message: err?.message || String(err) });
        });
    });

    // Cleanup: cancel prefetch if component unmounts
    return () => {
      if ('requestIdleCallback' in window && prefetchHandle) {
        cancelIdleCallback(prefetchHandle);
      }
    };
  }, [isAuthenticated, userId]);
};
