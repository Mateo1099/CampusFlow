/**
 * Unified data store service — "La mesa en la entrada"
 * In-memory Stale-While-Revalidate cache with in-flight deduplication
 * for all CampusFlow entities (tasks, courses, habits, habitLogs, planners, studySessions, snapshot).
 *
 * Design principles:
 * 1. Synchronous entryway: If data is already in memory or localStorage, serve it in 0 ms.
 * 2. Stale-While-Revalidate: If data is within TTL (4 min), return cached data without network call.
 *    If expired, return cached data immediately to keep UI interactive and revalidate in background.
 * 3. In-flight promise deduplication: Simultaneous callers share the same in-flight request.
 * 4. Reactive subscribers: Hooks and contexts update seamlessly when background revalidations finish.
 * 5. Immediate mutation invalidation: Mutations optimistically update memory and localStorage immediately.
 */

import { tasksService, getLocalTasks, saveLocalTasks } from './tasksService';
import { coursesService, getLocalCourses, saveLocalCourses } from './coursesService';
import { habitsService } from './habitsService';
import { plannerService } from './plannerService';
import { getCurrentWeekSnapshot } from './analyticsService';
import { getStudySessions, getLocalStudySessions, saveLocalStudySessions } from '../services/studySessionService';
import { notesService, loadLocalNotes, saveLocalNotes } from '../services/notesService';

// ─── Cache configuration ────────────────────────────────────────────
// TTL: 4 minutes (between 3 and 5 minutes as specified)
export const CACHE_TTL_MS = 4 * 60 * 1000;

// ─── Internal state ─────────────────────────────────────────────────
const _cache = new Map();         // key → { data, lastFetched, isInitialized: true }
const _inflight = new Map();      // key → Promise
const _bulkInflight = new Map();  // userId → Promise
const _subscribers = new Map();   // key → Set<Function>

const perfLog = (event, payload = {}) => {
  const ts = performance.now();
  const entry = { event, ts, source: 'dataStoreService', ...payload };
  if (typeof window !== 'undefined') {
    window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
    window.__CF_PERF_LOGS.push(entry);
  }
};

// ─── Key helper ─────────────────────────────────────────────────────
function _cacheKey(entity, userId) {
  return `ds:${entity}:${userId || 'guest'}`;
}

// ─── Local Storage Tier Fallback ────────────────────────────────────
function _getLocalStorageData(entity, userId) {
  if (!userId) return null;
  try {
    switch (entity) {
      case 'tasks': {
        const local = getLocalTasks(userId);
        return Array.isArray(local) && local.length > 0 ? local : null;
      }
      case 'courses': {
        const local = getLocalCourses(userId);
        return Array.isArray(local) && local.length > 0 ? local : null;
      }
      case 'studySessions': {
        const local = getLocalStudySessions(userId);
        return Array.isArray(local) && local.length > 0 ? local : null;
      }
      case 'notes': {
        const local = loadLocalNotes(userId);
        return Array.isArray(local) && local.length > 0 ? local : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function _syncLocalStorage(entity, userId, data) {
  if (!userId || !Array.isArray(data)) return;
  try {
    switch (entity) {
      case 'tasks':
        saveLocalTasks(userId, data);
        break;
      case 'courses':
        saveLocalCourses(userId, data);
        break;
      case 'studySessions':
        saveLocalStudySessions(userId, data);
        break;
      case 'notes':
        saveLocalNotes(userId, data);
        break;
      default:
        break;
    }
  } catch {
    // Graceful degradation
  }
}

// ─── Subscribers Notification ───────────────────────────────────────
function _notifySubscribers(key, freshData) {
  const listeners = _subscribers.get(key);
  if (!listeners || listeners.size === 0) return;
  listeners.forEach((callback) => {
    try {
      callback(freshData);
    } catch (err) {
      console.warn(`[dataStoreService] Subscriber callback error for ${key}:`, err?.message);
    }
  });
}

// ─── Internal Stale-While-Revalidate Engine ──────────────────────────
function _setCacheEntry(key, data, timestamp = Date.now()) {
  _cache.set(key, {
    data,
    lastFetched: timestamp,
    isInitialized: true
  });
}

async function _fetchSWR(key, entity, userId, fetcher, options = {}) {
  const entry = _cache.get(key);
  const now = Date.now();
  const isFresh = entry && (now - entry.lastFetched < CACHE_TTL_MS);

  // 1. FRESH HIT: Serve directly from memory without network or spinners
  if (isFresh && !options.forceRefresh) {
    perfLog('ds_cache_hit_fresh', { key });
    return entry.data;
  }

  // 2. STALE HIT (Stale-While-Revalidate):
  // Return cached data immediately to keep UI 100% interactive (0 ms latency).
  // Revalidate in background silently.
  if (entry && !options.forceRefresh) {
    perfLog('ds_cache_hit_stale_revalidate', { key });

    if (!_inflight.has(key)) {
      const bgPromise = fetcher()
        .then((freshData) => {
          if (freshData !== undefined) {
            _setCacheEntry(key, freshData);
            _syncLocalStorage(entity, userId, freshData);
            _notifySubscribers(key, freshData);
            perfLog('ds_swr_background_complete', { key });
          }
          return freshData;
        })
        .catch((err) => {
          console.warn(`[dataStore] background revalidation warning for ${key}:`, err?.message);
          return entry.data;
        })
        .finally(() => {
          _inflight.delete(key);
        });

      _inflight.set(key, bgPromise);
    }

    return entry.data;
  }

  // 3. IN-FLIGHT DEDUPLICATION: Piggy-back on existing network promise
  if (_inflight.has(key)) {
    perfLog('ds_inflight_reuse', { key });
    return _inflight.get(key);
  }

  // 4. CACHE MISS OR FORCED REFRESH: Check localStorage first for instant initial fallback
  const localFallback = _getLocalStorageData(entity, userId);
  if (localFallback && !options.forceRefresh && !entry) {
    // Populate memory with local fallback tier (marked as stale so it revalidates)
    _setCacheEntry(key, localFallback, 0);
  }

  perfLog('ds_fetch_start', { key });
  const promise = fetcher()
    .then((freshData) => {
      const dataToSave = freshData !== undefined ? freshData : (entry?.data || localFallback || []);
      _setCacheEntry(key, dataToSave);
      _syncLocalStorage(entity, userId, dataToSave);
      _notifySubscribers(key, dataToSave);
      perfLog('ds_fetch_end', { key });
      return dataToSave;
    })
    .catch((err) => {
      console.warn(`[dataStore] fetch failed for ${key}:`, err?.message);
      if (entry?.data !== undefined) return entry.data;
      if (localFallback) return localFallback;
      return [];
    })
    .finally(() => {
      _inflight.delete(key);
    });

  _inflight.set(key, promise);
  return promise;
}

// ─── Public API ─────────────────────────────────────────────────────

export const dataStoreService = {
  // ── Synchronous Cache Readers ("La mesa en la entrada") ─────────

  /**
   * Synchronously returns cached data from memory or localStorage.
   * If found in localStorage, hydrates memory immediately.
   */
  getCachedData(entity, userId) {
    if (!userId) return null;
    const key = _cacheKey(entity, userId);
    const entry = _cache.get(key);
    if (entry?.data !== undefined) {
      return entry.data;
    }

    // Check localStorage tier
    const local = _getLocalStorageData(entity, userId);
    if (local !== null) {
      _setCacheEntry(key, local, 0); // Stored in memory with lastFetched = 0 to trigger SWR
      return local;
    }

    return null;
  },

  /**
   * Returns true if there is any cached data in memory or local storage.
   */
  hasCachedData(entity, userId) {
    if (!userId) return false;
    const key = _cacheKey(entity, userId);
    if (_cache.has(key)) return true;
    return _getLocalStorageData(entity, userId) !== null;
  },

  /**
   * Returns cache entry metadata (data, lastFetched, isInitialized, isFresh).
   */
  getCacheEntry(entity, userId) {
    if (!userId) return null;
    const key = _cacheKey(entity, userId);
    const entry = _cache.get(key);
    if (!entry) {
      const local = _getLocalStorageData(entity, userId);
      if (local !== null) {
        _setCacheEntry(key, local, 0);
        return { data: local, lastFetched: 0, isInitialized: true, isFresh: false };
      }
      return null;
    }
    const isFresh = Date.now() - entry.lastFetched < CACHE_TTL_MS;
    return { ...entry, isFresh };
  },

  // ── Synchronous Cache Mutators ──────────────────────────────────

  /**
   * Directly sets cached data in memory and persists to localStorage.
   * Updates lastFetched and notifies subscribers.
   */
  setCachedData(entity, userId, data, updateTimestamp = true) {
    if (!userId) return;
    const key = _cacheKey(entity, userId);
    const existing = _cache.get(key);
    const timestamp = updateTimestamp ? Date.now() : (existing?.lastFetched || Date.now());
    _setCacheEntry(key, data, timestamp);
    _syncLocalStorage(entity, userId, data);
    _notifySubscribers(key, data);
  },

  /**
   * Optimistically prepends or appends a new item to the cached array.
   */
  addCachedItem(entity, userId, newItem, prepend = true) {
    if (!userId || !newItem) return;
    const current = this.getCachedData(entity, userId) || [];
    const filtered = current.filter(item => String(item?.id) !== String(newItem?.id));
    const updated = prepend ? [newItem, ...filtered] : [...filtered, newItem];
    this.setCachedData(entity, userId, updated, true);
  },

  /**
   * Optimistically updates an existing item in the cached array.
   */
  updateCachedItem(entity, userId, itemId, updater) {
    if (!userId || !itemId) return;
    const current = this.getCachedData(entity, userId) || [];
    const updated = current.map((item) => {
      if (String(item?.id) === String(itemId)) {
        return typeof updater === 'function' ? updater(item) : { ...item, ...updater };
      }
      return item;
    });
    this.setCachedData(entity, userId, updated, true);
  },

  /**
   * Optimistically removes an item from the cached array.
   */
  removeCachedItem(entity, userId, itemId) {
    if (!userId || !itemId) return;
    const current = this.getCachedData(entity, userId) || [];
    const updated = current.filter(item => String(item?.id) !== String(itemId));
    this.setCachedData(entity, userId, updated, true);
  },

  // ── Subscriptions ───────────────────────────────────────────────

  /**
   * Subscribes a callback to receive fresh data when SWR revalidations or mutations occur.
   * Returns an unsubscribe function.
   */
  subscribe(entity, userId, callback) {
    if (!userId || typeof callback !== 'function') return () => {};
    const key = _cacheKey(entity, userId);
    if (!_subscribers.has(key)) {
      _subscribers.set(key, new Set());
    }
    const set = _subscribers.get(key);
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        _subscribers.delete(key);
      }
    };
  },

  // ── Entity Fetchers (SWR + In-flight deduplication) ─────────────

  getTasks(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('tasks', userId);
    return _fetchSWR(key, 'tasks', userId, () => tasksService.getTasks(userId, options).catch(() => getLocalTasks(userId) || []), options);
  },

  getCompletedTasks(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const limit = options.limit || 50;
    const page = options.page || 1;
    const key = `ds:completedTasks:${userId}:${page}:${limit}`;
    return _fetchSWR(key, 'completedTasks', userId, () => tasksService.getCompletedTasks(userId, options).catch(() => []), options);
  },

  getCourses(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('courses', userId);
    return _fetchSWR(key, 'courses', userId, () => coursesService.getCourses(userId).catch(() => getLocalCourses(userId) || []), options);
  },

  getHabits(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('habits', userId);
    return _fetchSWR(key, 'habits', userId, () => habitsService.getHabits(userId).catch(() => []), options);
  },

  getHabitLogs(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('habitLogs', userId);
    return _fetchSWR(key, 'habitLogs', userId, () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      return habitsService.getLogs(userId, startOfDay, endOfDay).catch(() => []);
    }, options);
  },

  getPlanners(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('planners', userId);
    return _fetchSWR(key, 'planners', userId, () => plannerService.getPlanners(userId).catch(() => []), options);
  },

  getSnapshot(userId, options = {}) {
    if (!userId) return Promise.resolve(null);
    const key = _cacheKey('snapshot', userId);
    return _fetchSWR(key, 'snapshot', userId, () => getCurrentWeekSnapshot(userId).catch(() => null), options);
  },

  getStudySessions(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('studySessions', userId);
    return _fetchSWR(key, 'studySessions', userId, () => getStudySessions(userId, options).catch(() => getLocalStudySessions(userId) || []), options);
  },

  getNotes(userId, options = {}) {
    if (!userId) return Promise.resolve([]);
    const key = _cacheKey('notes', userId);
    return _fetchSWR(key, 'notes', userId, () => notesService.getNotes(userId, options).catch(() => loadLocalNotes(userId) || []), options);
  },

  // ── Bulk fetch for analytics ────────────────────────────────────

  async getAllAnalyticsData(userId) {
    if (!userId) return { tasks: [], habits: [], logs: [], planners: [], snapshot: null };

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

  invalidate(entity, userId, options = {}) {
    const key = _cacheKey(entity, userId);
    if (options.hard) {
      _cache.delete(key);
    } else {
      const entry = _cache.get(key);
      if (entry) {
        entry.lastFetched = 0; // Mark stale so next request revalidates in background
      }
    }
    _inflight.delete(key);
    _bulkInflight.delete(userId);
    perfLog('ds_invalidate', { key });
  },

  invalidateAll(userId, options = {}) {
    if (!userId) return;
    for (const entity of ['tasks', 'courses', 'habits', 'habitLogs', 'planners', 'snapshot', 'studySessions', 'notes', 'completedTasks']) {
      this.invalidate(entity, userId, options);
    }
  },

  // ── Cleanup & Memory Management ─────────────────────────────────

  clearUserCache(userId) {
    if (!userId) return;
    for (const key of _cache.keys()) {
      if (key.endsWith(`:${userId}`)) {
        _cache.delete(key);
        _inflight.delete(key);
        _subscribers.delete(key);
      }
    }
    _bulkInflight.delete(userId);
  },

  clearAll() {
    _cache.clear();
    _inflight.clear();
    _bulkInflight.clear();
    _subscribers.clear();
  },

  warm(entity, userId, data) {
    if (!userId || data === undefined) return;
    this.setCachedData(entity, userId, data, true);
  },

  getStatus() {
    return {
      cacheSize: _cache.size,
      inflightSize: _inflight.size,
      subscribersCount: _subscribers.size,
      keys: [..._cache.keys()],
      inflight: [..._inflight.keys()],
    };
  },
};
