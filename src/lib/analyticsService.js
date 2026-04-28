import { supabase } from './supabaseClient';

const analyticsQueryTracker = new Map();
const snapshotCache = new Map();
const snapshotInFlight = new Map();
const SNAPSHOT_CACHE_TTL_MS = 5000;

const perfLog = (event, payload = {}) => {
  const ts = performance.now();
  const entry = { event, ts, source: 'analyticsService', ...payload };
  if (typeof window !== 'undefined') {
    window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
    window.__CF_PERF_LOGS.push(entry);
    window.__CF_QUERY_COUNT = (window.__CF_QUERY_COUNT || 0) + (event.includes('query_start') ? 1 : 0);
  }
  console.log('[PERF]', entry);
};

const getStartOfWeekDate = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  start.setHours(0, 0, 0, 0);
  return start.toISOString().split('T')[0];
};

const getSnapshotCacheKey = (userId, startOfWeek) => `${userId}:${startOfWeek}`;

const getCachedSnapshot = (cacheKey) => {
  const cached = snapshotCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > SNAPSHOT_CACHE_TTL_MS) {
    snapshotCache.delete(cacheKey);
    return null;
  }

  return cached.data;
};

const setCachedSnapshot = (cacheKey, data) => {
  snapshotCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

export async function getCurrentWeekSnapshot(userId) {
  if (!userId) return null;

  try {
    const startOfWeek = getStartOfWeekDate();
    const queryKey = `analyticsService.getCurrentWeekSnapshot:${userId}:${startOfWeek}`;
    const snapshotCacheKey = getSnapshotCacheKey(userId, startOfWeek);

    const cachedSnapshot = getCachedSnapshot(snapshotCacheKey);
    if (cachedSnapshot) {
      perfLog('analytics_snapshot_cache_hit', { queryKey, userId });
      return cachedSnapshot;
    }

    const inFlightRequest = snapshotInFlight.get(snapshotCacheKey);
    if (inFlightRequest) {
      perfLog('analytics_snapshot_inflight_reuse', { queryKey, userId });
      return inFlightRequest;
    }

    const startTs = performance.now();
    const lastTs = analyticsQueryTracker.get(queryKey);
    perfLog('analytics_snapshot_query_start', { queryKey, userId, startOfWeek });
    if (typeof lastTs === 'number' && startTs - lastTs < 1200) {
      perfLog('analytics_snapshot_query_duplicate_detected', {
        queryKey,
        userId,
        deltaMs: Number((startTs - lastTs).toFixed(2))
      });
    }
    analyticsQueryTracker.set(queryKey, startTs);

    const queryPromise = (async () => {
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('snapshot_date,week_start_date,total_blocks_created,total_blocks_completed,total_blocks_pending,total_planned_minutes,total_assignments,completed_assignments,pending_assignments,total_habits,completed_habits,morning_minutes,afternoon_minutes,night_minutes,minutes_by_day,overall_compliance_percent,trend_direction')
        .eq('user_id', userId)
        .eq('period_type', 'weekly')
        .gte('week_start_date', startOfWeek)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      perfLog('analytics_snapshot_query_end', {
        queryKey,
        userId,
        durationMs: Number((performance.now() - startTs).toFixed(2)),
        hasRow: Boolean(data),
        hasError: Boolean(error)
      });

      if (error) {
        console.error('Error leyendo snapshot semanal:', error);
        return null;
      }

      const snapshotData = data || null;
      if (snapshotData) {
        setCachedSnapshot(snapshotCacheKey, snapshotData);
      }

      return snapshotData;
    })();

    snapshotInFlight.set(snapshotCacheKey, queryPromise);

    try {
      return await queryPromise;
    } finally {
      snapshotInFlight.delete(snapshotCacheKey);
    }
  } catch (err) {
    console.error('Error inesperado leyendo snapshot semanal:', err);
    return null;
  }
}

export async function saveWeeklySnapshot(userId, analyticsData) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const queryKey = `analyticsService.saveWeeklySnapshot:${userId}:${today}`;
    const startTs = performance.now();
    const lastTs = analyticsQueryTracker.get(queryKey);
    perfLog('analytics_save_query_start', { queryKey, userId, day: today });
    if (typeof lastTs === 'number' && startTs - lastTs < 1200) {
      perfLog('analytics_save_query_duplicate_detected', {
        queryKey,
        userId,
        deltaMs: Number((startTs - lastTs).toFixed(2))
      });
    }
    analyticsQueryTracker.set(queryKey, startTs);

    const snapshot = {
      user_id: userId,
      snapshot_date: today,
      week_start_date: today,
      period_type: 'weekly',

      total_blocks_created: (analyticsData?.completedBlocks || 0) + (analyticsData?.pendingBlocks || 0),
      total_blocks_completed: analyticsData?.completedBlocks || 0,
      total_blocks_pending: analyticsData?.pendingBlocks || 0,

      total_planned_minutes: analyticsData?.totalMinutes || 0,
      completed_minutes: analyticsData?.totalMinutes || 0,

      total_assignments: analyticsData?.totalTasks || 0,
      completed_assignments: analyticsData?.completedTasks || 0,
      pending_assignments: analyticsData?.pendingTasks || 0,

      total_habits: analyticsData?.totalHabits || 0,
      completed_habits: analyticsData?.completedHabits || 0,

      morning_minutes: analyticsData?.minutesByTime?.morning || 0,
      afternoon_minutes: analyticsData?.minutesByTime?.afternoon || 0,
      night_minutes: analyticsData?.minutesByTime?.night || 0,

      minutes_by_day: analyticsData?.minutesByDay || {},

      overall_compliance_percent: analyticsData?.overallCompliance || 0,
      trend_direction: analyticsData?.historicalSummary?.tendencia || 'stable'
    };

    const { data, error } = await supabase
      .from('analytics_snapshots')
      .upsert([snapshot], {
        onConflict: 'user_id,snapshot_date,period_type'
      });

    if (!error) {
      const snapshotCacheKey = getSnapshotCacheKey(userId, getStartOfWeekDate());
      setCachedSnapshot(snapshotCacheKey, snapshot);
    }

    perfLog('analytics_save_query_end', {
      queryKey,
      userId,
      durationMs: Number((performance.now() - startTs).toFixed(2)),
      hasError: Boolean(error)
    });

    if (error) {
      console.error('Error guardando snapshot:', error);
      return { success: false, error };
    }

    return { success: true, data };

  } catch (err) {
    console.error('Error inesperado:', err);
    return { success: false, error: err };
  }
}