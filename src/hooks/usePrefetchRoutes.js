import { useEffect, useRef } from 'react';
import { dataStoreService } from '../lib/dataStoreService';

/**
 * Intelligent route prefetching hook — OPTIMIZED
 *
 * Instead of calling prefetchWeeklyPlannerData + prefetchAnalyticsData
 * (which each independently fetch tasks, habits, planners, courses from
 * Supabase, duplicating what TaskContext already does), we now simply
 * warm the unified dataStoreService cache with a single bulk call.
 *
 * Since the data store deduplicates in-flight requests, this is a no-op
 * if TaskContext hooks have already triggered the same fetches.
 *
 * We still prefetch component JS bundles for instant navigation.
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

      // Warm the unified data store — this is a NO-OP if TaskContext
      // hooks have already triggered these fetches (deduplication).
      // One call warms tasks, habits, logs, planners, snapshot, and courses.
      console.log(`[PREFETCH] Warming data store for user ${userId}`);

      dataStoreService.getAllAnalyticsData(userId)
        .then(() => {
          perfLog('prefetch_datastore_warm_done', {
            durationMs: Number((performance.now() - prefetchStartTs).toFixed(2))
          });
        })
        .catch((err) => {
          console.warn(`[PREFETCH] Data store warm error:`, err);
        });

      dataStoreService.getCourses(userId)
        .then(() => {
          perfLog('prefetch_courses_warm_done', {
            durationMs: Number((performance.now() - prefetchStartTs).toFixed(2))
          });
        })
        .catch((err) => {
          console.warn(`[PREFETCH] Courses warm error:`, err);
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
