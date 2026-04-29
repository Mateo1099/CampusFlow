/**
 * Unified data store service — single source of truth for all Supabase fetches.
 *
 * Design goals
 * ────────────
 * 1. Each entity (tasks, courses, habits, habitLogs, planners, snapshot)
 *    is fetched AT MOST ONCE per TTL window, no matter how many React hooks,
 *    prefetch calls, or navigation triggers fire concurrently.
 * 2. In-flight promise de-duplication: if a fetch is already running for
 *    a given key, every subsequent caller piggy-backs on the same promise.
 * 3. Short TTL (10 s) so data stays reasonably fresh for interactive pages,
 *    but long enough to cover the first-load cascade.
 * 4. Invalidation API for mutation hooks (add/update/delete).
 * 5. Zero UI dependency — pure service, importable from hooks AND services.
 */

import { tasksService } from './tasksService';
import { coursesService } from './coursesService';
import { habitsService } from './habitsService';
import { plannerService } from './plannerService';
import { getCurrentWeekSnapshot } from './analyticsService';

// ─── Cache configuration ────────────────────────────────────────────
// ─── Cache configuration ────────────────────────────────────────────
const CACHE_TTL_MS = 30_000; // 30 seconds - increased to cover full app initialization

// ─── Internal state ─────────────────────────────────────────────────
const _cache = new Map();      // key → { data, ts }
const _inflight = new Map();   // key → Promise
const _bulkInflight = new Map(); // userId → Promise

const perfLog = (event, payload = {}) => {
  const ts = performance.now();
  const entry = { event, ts, source: 'dataStoreService', ...payload };
  if (typeof window !== 'undefined') {
    window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
    window.__CF_PERF_LOGS.push(entry);
  }
  console.log('[PERF]', entry);
};

// ─── Low-level helpers ──────────────────────────────────────────────

function _cacheKey(entity, userId) {
  return `ds:${entity}:${userId}`;
}

function _getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function _setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

/**
 * Execute-or-reuse pattern:
 *  - Return cached data instantly if within TTL.
 *  - Else, if an identical fetch is already in-flight, return that promise.
 *  - Else, start a new fetch, cache the result, and return it.
 */
async function _fetchOnce(key, fetcher) {
  // 1. Cache hit
  const cached = _getCached(key);
  if (cached !== undefined) {
    perfLog('ds_cache_hit', { key });
    return cached;
  }

  // 2. In-flight hit
  if (_inflight.has(key)) {
    perfLog('ds_inflight_reuse', { key });
    return _inflight.get(key);
  }

  // 3. New fetch
  perfLog('ds_fetch_start', { key });
  const promise = fetcher()
    .then((data) => {
      _setCache(key, data);
      perfLog('ds_fetch_end', { key });
      return data;
    })
    .catch((err) => {
      console.error(`[dataStore] fetch failed for ${key}:`, err);
      throw err;
    })
    .finally(() => {
      _inflight.delete(key);
    });

  _inflight.set(key, promise);
  return promise;
}

// ─── Public API ─────────────────────────────────────────────────────

export const dataStoreService = {
  // ── Individual entity fetchers ──────────────────────────────────

  getTasks(userId) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('tasks', userId);
    return _fetchOnce(key, () => tasksService.getTasks(userId).catch(() => []));
  },

  getCourses(userId) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('courses', userId);
    return _fetchOnce(key, () => coursesService.getCourses(userId).catch(() => []));
  },

  getHabits(userId) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('habits', userId);
    return _fetchOnce(key, () => habitsService.getHabits(userId).catch(() => []));
  },

  getHabitLogs(userId) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('habitLogs', userId);
    return _fetchOnce(key, () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      return habitsService.getLogs(userId, startOfDay, endOfDay).catch(() => []);
    });
  },

  getPlanners(userId) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('planners', userId);
    return _fetchOnce(key, () => plannerService.getPlanners(userId).catch(() => []));
  },

  getSnapshot(userId) {
    if (!userId) return Promise.resolve(null);
    const key = _cacheKey('snapshot', userId);
    return _fetchOnce(key, () => getCurrentWeekSnapshot(userId).catch(() => null));
  },

  // ── Bulk fetch — single await for everything analytics needs ────

  async getAllAnalyticsData(userId) {
    if (!userId) return { tasks: [], habits: [], logs: [], planners: [], snapshot: null };

    // 1. Bulk de-duplication: if already fetching all for this user, reuse that promise
    if (_bulkInflight.has(userId)) {
      perfLog('ds_bulk_reuse', { userId });
      return _bulkInflight.get(userId);
    }

    const bulkPromise = (async () => {
      perfLog('ds_bulk_start', { userId });

      const [tasks, habits, logs, planners, snapshot] = await Promise.all([
        this.getTasks(userId),
        this.getHabits(userId),
        this.getHabitLogs(userId),
        this.getPlanners(userId),
        this.getSnapshot(userId),
      ]);

      perfLog('ds_bulk_end', { userId });
      return { tasks, habits, logs, planners, snapshot };
    })().finally(() => {
      _bulkInflight.delete(userId);
    });

    _bulkInflight.set(userId, bulkPromise);
    return bulkPromise;
  },

  // ── Invalidation ────────────────────────────────────────────────

  invalidate(entity, userId) {
    const key = _cacheKey(entity, userId);
    _cache.delete(key);
    _inflight.delete(key);
    _bulkInflight.delete(userId); // Also invalidate bulk to be safe
    perfLog('ds_invalidate', { key });
  },

  invalidateAll(userId) {
    if (!userId) return;
    for (const entity of ['tasks', 'courses', 'habits', 'habitLogs', 'planners', 'snapshot']) {
      this.invalidate(entity, userId);
    }
  },

  // ── Warm cache (setter, for when hooks already have data) ───────

  warm(entity, userId, data) {
    if (!userId || data === undefined) return;
    const key = _cacheKey(entity, userId);
    _setCache(key, data);
  },

  // ── Debug ───────────────────────────────────────────────────────

  getStatus() {
    return {
      cacheSize: _cache.size,
      inflightSize: _inflight.size,
      keys: [..._cache.keys()],
      inflight: [..._inflight.keys()],
    };
  },
};
