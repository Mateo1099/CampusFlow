import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from './../context/AuthContext';
import { saveWeeklySnapshot } from './../lib/analyticsService';
import { getAnalyticsDataFromCache } from './../lib/prefetchAnalyticsData';
import { prefetchCacheService } from './../lib/prefetchCacheService';
import { dataStoreService } from './../lib/dataStoreService';

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

const inMemoryAnalyticsCache = new Map();

// Memoized constants to avoid recreation
const COMPLETED_TASK_STATUSES = new Set(['entregado', 'submitted', 'completado', 'done']);
const COMPLETED_BLOCK_STATUSES = new Set(['completado', 'completed', 'done']);
const WEEK_DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIASES = {
  monday: 'monday', lunes: 'monday', lun: 'monday', mon: 'monday',
  tuesday: 'tuesday', martes: 'tuesday', mar: 'tuesday', tue: 'tuesday',
  wednesday: 'wednesday', miercoles: 'wednesday', miércoles: 'wednesday', mie: 'wednesday', mié: 'wednesday', wed: 'wednesday',
  thursday: 'thursday', jueves: 'thursday', jue: 'thursday', thu: 'thursday',
  friday: 'friday', viernes: 'friday', vie: 'friday', fri: 'friday',
  saturday: 'saturday', sabado: 'saturday', sábado: 'saturday', sab: 'saturday', sat: 'saturday',
  sunday: 'sunday', domingo: 'sunday', dom: 'sunday', sun: 'sunday'
};

// Utility functions (memoized externally)
const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const getNormalizedDay = (value) => {
  const normalized = normalizeText(value).replace(/_/g, ' ');
  return DAY_ALIASES[normalized] || DAY_ALIASES[normalized.replace(/\s+/g, '')] || null;
};
const getNormalizedTime = (value) => {
  const normalized = normalizeText(value).replace(/_/g, ' ');
  if (normalized === 'mañana' || normalized === 'manana') return 'morning';
  if (normalized === 'tarde') return 'afternoon';
  if (normalized === 'noche') return 'night';
  return ['morning', 'afternoon', 'night'].includes(normalized) ? normalized : null;
};

const buildHistoricalSummary = (blocks) => {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  startOfThisWeek.setHours(0, 0, 0, 0);

  const thisWeekTs = startOfThisWeek.getTime();
  const lastWeekTs = thisWeekTs - 7 * 24 * 60 * 60 * 1000;

  const getBlocksByWeek = (targetTs) => {
    const targetEnd = targetTs + 7 * 24 * 60 * 60 * 1000;
    return blocks.filter((b) => {
      const dateStr = b.created_at || b.updated_at;
      if (!dateStr) return false;
      const ts = new Date(dateStr).getTime();
      return ts >= targetTs && ts < targetEnd;
    });
  };

  const thisWeekBlocks = getBlocksByWeek(thisWeekTs);
  const lastWeekBlocks = getBlocksByWeek(lastWeekTs);

  const thisWeekMinutes = thisWeekBlocks.reduce((acc, b) => acc + normalizeNumber(b?.duration_minutes), 0);
  const lastWeekMinutes = lastWeekBlocks.reduce((acc, b) => acc + normalizeNumber(b?.duration_minutes), 0);
  const diffMinutes = thisWeekMinutes - lastWeekMinutes;

  let trend = 'stable';
  if (diffMinutes > 0) trend = 'up';
  if (diffMinutes < 0) trend = 'down';

  return {
    semanaActual: { minutos: thisWeekMinutes, bloques: thisWeekBlocks.length },
    semanaAnterior: { minutos: lastWeekMinutes, bloques: lastWeekBlocks.length },
    diferenciaMinutos: diffMinutes,
    diferenciaBloques: thisWeekBlocks.length - lastWeekBlocks.length,
    tendencia: trend
  };
};

const buildInsights = ({ totalMinutes, completedBlocks, pendingBlocks, minutesByTime, historicalSummary }) => {
  const insights = [];
  const noBlocks = pendingBlocks + completedBlocks === 0;

  if (noBlocks && totalMinutes === 0) {
    insights.push({ id: 'no-activity', type: 'info', message: 'No tienes planificación esta semana.' });
    return insights;
  }

  if (pendingBlocks > completedBlocks) {
    insights.push({ id: 'pending-warning', type: 'warning', message: 'Tienes varios bloques pendientes esta semana.' });
  }
  if (totalMinutes < 60 && totalMinutes > 0) {
    insights.push({ id: 'low-plan', type: 'warning', message: 'Tu planificación es muy baja. Intenta agregar más bloques.' });
  }
  if (completedBlocks > pendingBlocks && completedBlocks > 0) {
    insights.push({ id: 'good-job', type: 'success', message: 'Buen trabajo, estás cumpliendo tu planificación.' });
  }
  if ((minutesByTime?.morning || 0) > (minutesByTime?.afternoon || 0) + (minutesByTime?.night || 0)) {
    insights.push({ id: 'morning-heavy', type: 'info', message: 'Tu carga está concentrada en la mañana. Considera balancear tu día.' });
  }
  if (historicalSummary?.tendencia === 'down') {
    insights.push({ id: 'trend-down', type: 'warning', message: 'Tu actividad bajó respecto a la semana pasada.' });
  }

  return insights;
};

const buildRecommendations = ({ totalMinutes, completedBlocks, pendingBlocks, minutesByDay, minutesByTime }) => {
  const recommendations = [];
  const totalBlocks = completedBlocks + pendingBlocks;
  const noBlocks = totalBlocks === 0;

  if (noBlocks && totalMinutes === 0) return recommendations;

  if (totalMinutes > 0 && totalMinutes < 60) {
    recommendations.push({
      id: 'low-planning',
      priority: 'high',
      title: 'Planificación baja',
      description: 'Tu semana tiene poca carga planificada. Agrega al menos 2 bloques más para tener una guía clara.',
      actionLabel: 'Agregar bloques'
    });
  }

  if (pendingBlocks > completedBlocks && totalBlocks > 0) {
    recommendations.push({
      id: 'pending-blocks',
      priority: 'high',
      title: 'Bloques pendientes acumulados',
      description: 'Tienes más bloques pendientes que completados. Prioriza completar los bloques ya creados antes de añadir demasiados nuevos.',
      actionLabel: 'Revisar pendientes'
    });
  }

  if (minutesByTime?.morning) {
    const afternoonTotal = (minutesByTime?.afternoon || 0) + (minutesByTime?.night || 0);
    if (minutesByTime.morning > afternoonTotal && afternoonTotal > 0) {
      recommendations.push({
        id: 'morning-heavy',
        priority: 'medium',
        title: 'Carga concentrada en la mañana',
        description: 'Tu planificación está muy cargada en la mañana. Considera mover parte del trabajo a la tarde para equilibrar tu energía.',
        actionLabel: 'Balancear horarios'
      });
    }
  }

  if (Array.isArray(minutesByDay) && minutesByDay.length > 0) {
    const zeroMinutesDays = minutesByDay.filter((m) => m === 0).length;
    const hasActivity = minutesByDay.some((m) => m > 0);
    if (zeroMinutesDays > 0 && hasActivity && zeroMinutesDays >= 3) {
      recommendations.push({
        id: 'uneven-distribution',
        priority: 'medium',
        title: 'Días sin planificación',
        description: 'Hay días sin bloques asignados. Distribuir mejor la semana puede ayudarte a evitar acumulaciones.',
        actionLabel: 'Distribuir semana'
      });
    }
  }

  if (completedBlocks > pendingBlocks && completedBlocks > 0) {
    recommendations.push({
      id: 'good-pace',
      priority: 'low',
      title: 'Buen ritmo',
      description: 'Vas cumpliendo más de lo que dejas pendiente. Mantén este patrón esta semana.',
      actionLabel: 'Mantener ritmo'
    });
  }

  return recommendations;
};

const hasAnyFastAnalyticsData = (value) => {
  if (!value) return false;
  return (
    (value.totalTasks || 0) > 0 ||
    (value.totalMinutes || 0) > 0 ||
    (value.completedBlocks || 0) > 0 ||
    (value.pendingBlocks || 0) > 0 ||
    (value.totalHabits || 0) > 0
  );
};

const mapSnapshotToAnalytics = (snapshot) => {
  if (!snapshot) return null;

  const minutesByDay = Array.isArray(snapshot.minutes_by_day)
    ? snapshot.minutes_by_day
    : [0, 0, 0, 0, 0, 0, 0];

  const totalTasks = normalizeNumber(snapshot.total_assignments);
  const completedTasks = normalizeNumber(snapshot.completed_assignments);
  const pendingTasks = normalizeNumber(snapshot.pending_assignments) || Math.max(totalTasks - completedTasks, 0);

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    totalHabits: normalizeNumber(snapshot.total_habits),
    completedHabits: normalizeNumber(snapshot.completed_habits),
    totalMinutes: normalizeNumber(snapshot.total_planned_minutes),
    completedBlocks: normalizeNumber(snapshot.total_blocks_completed),
    pendingBlocks: normalizeNumber(snapshot.total_blocks_pending),
    minutesByDay,
    minutesByTime: {
      morning: normalizeNumber(snapshot.morning_minutes),
      afternoon: normalizeNumber(snapshot.afternoon_minutes),
      night: normalizeNumber(snapshot.night_minutes)
    }
  };
};

/**
 * useAnalytics — OPTIMIZED
 *
 * Instead of calling useTasks / useHabits / usePlanners (which each
 * independently fetch from Supabase), this version reads SHARED data
 * from the unified dataStoreService.  Since TaskContext already fetches
 * tasks, habits, and courses at the provider level, this hook only needs
 * to fetch PLANNERS (shared via dataStore) and the snapshot.
 *
 * External data (tasks, habits, logs) can be injected via the optional
 * `externalData` parameter — used by consumers that already have the
 * data (e.g. Dashboard which uses TaskContext).
 */
export const useAnalytics = (externalData) => {
  const perfLog = useCallback((event, payload = {}) => {
    const ts = performance.now();
    const entry = { event, ts, hook: 'useAnalytics', ...payload };
    if (typeof window !== 'undefined') {
      window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
      window.__CF_PERF_LOGS.push(entry);
    }
    console.log('[PERF]', entry);
  }, []);

  const { user } = useAuth();
  const userId = user?.id;

  // ── Shared raw data state ─────────────────────────────────────
  const [rawTasks, setRawTasks] = useState([]);
  const [rawHabits, setRawHabits] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [rawPlanners, setRawPlanners] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const initialCachedAnalytics = useMemo(() => {
    if (!userId) return DEFAULT_ANALYTICS;
    return inMemoryAnalyticsCache.get(userId) || getAnalyticsDataFromCache(userId) || DEFAULT_ANALYTICS;
  }, [userId]);

  const [analytics, setAnalytics] = useState(initialCachedAnalytics);
  const [loading, setLoading] = useState(!hasAnyFastAnalyticsData(initialCachedAnalytics));
  const lastSnapshotSignatureRef = useRef(null);
  const analyticsRef = useRef(initialCachedAnalytics);
  const fetchGuardRef = useRef('');

  useEffect(() => {
    analyticsRef.current = analytics;
  }, [analytics]);

  // ── Initial cache seed ────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setAnalytics(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }

    const cachedAnalytics = inMemoryAnalyticsCache.get(userId) || getAnalyticsDataFromCache(userId);
    if (cachedAnalytics) {
      setAnalytics((prev) => ({ ...prev, ...cachedAnalytics }));
      setLoading(false);
      return;
    }

    setAnalytics(DEFAULT_ANALYTICS);
    setLoading(true);
  }, [userId]);

  // ── Single bulk fetch via dataStoreService ────────────────────
  useEffect(() => {
    if (!userId) {
      setRawTasks([]);
      setRawHabits([]);
      setRawLogs([]);
      setRawPlanners([]);
      setDataLoading(false);
      return;
    }

    // Guard: skip if already fetching for this user
    const fetchKey = `useAnalytics:${userId}`;
    if (fetchGuardRef.current === fetchKey) return;
    fetchGuardRef.current = fetchKey;

    setDataLoading(true);
    perfLog('analytics_unified_fetch_start', { userId });

    dataStoreService.getAllAnalyticsData(userId).then(({ tasks, habits, logs, planners, snapshot }) => {
      perfLog('analytics_unified_fetch_end', { userId });

      setRawTasks(tasks || []);
      setRawHabits(habits || []);
      setRawLogs(logs || []);
      setRawPlanners(planners || []);
      setDataLoading(false);

      // Apply snapshot immediately if available
      const mapped = mapSnapshotToAnalytics(snapshot);
      if (mapped && hasAnyFastAnalyticsData(mapped)) {
        setAnalytics((prev) => ({ ...prev, ...mapped }));
        inMemoryAnalyticsCache.set(userId, { ...analyticsRef.current, ...mapped });
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[useAnalytics] bulk fetch error:', err);
      setDataLoading(false);
    });
  }, [userId, perfLog]);

  // Use external data if provided (from TaskContext), else use fetched data
  const tasks = externalData?.tasks ?? rawTasks;
  const habits = externalData?.habits ?? rawHabits;
  const logs = externalData?.logs ?? rawLogs;
  const planners = externalData?.planners ?? rawPlanners;
  const isCoreLoading = externalData ? false : dataLoading;

  // ✅ MEMOIZED: Task totals
  const taskTotals = useMemo(() => {
    const total = Array.isArray(tasks) ? tasks.length : 0;
    const completed = Array.isArray(tasks) ? tasks.filter(t => COMPLETED_TASK_STATUSES.has(normalizeText(t?.status))).length : 0;
    return {
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: Math.max(total - completed, 0)
    };
  }, [tasks]);

  // ✅ MEMOIZED: Habit totals
  const habitTotals = useMemo(() => {
    const total = Array.isArray(habits) ? habits.length : 0;
    let completed = 0;
    if (Array.isArray(habits) && habits.length > 0 && Array.isArray(logs) && logs.length > 0) {
      const habitIds = new Set(habits.map(h => String(h?.id)));
      const completedHabitIds = new Set();
      logs.forEach(log => {
        const habitId = log?.habit_id ?? log?.habitId;
        if (!habitId) return;
        if (habitIds.size > 0 && !habitIds.has(String(habitId))) return;
        completedHabitIds.add(String(habitId));
      });
      completed = completedHabitIds.size;
    }
    return {
      totalHabits: total,
      completedHabits: completed
    };
  }, [habits, logs]);

  // ✅ MEMOIZED: Planner blocks and block totals
  const blockTotals = useMemo(() => {
    let blocks = [];
    if (Array.isArray(planners)) {
      blocks = planners.flatMap(planner => (Array.isArray(planner?.planner_blocks) ? planner.planner_blocks : []));
    }
    
    const total = blocks.length;
    const completed = blocks.filter(b => COMPLETED_BLOCK_STATUSES.has(normalizeText(b?.status))).length;
    const totalMinutes = blocks.reduce((total, block) => total + normalizeNumber(block?.duration_minutes), 0);
    
    return {
      blocks,
      totalMinutes,
      completedBlocks: completed,
      pendingBlocks: Math.max(total - completed, 0)
    };
  }, [planners]);

  // One pass over planner blocks to avoid repeated traversal on first paint.
  const timeDistribution = useMemo(() => {
    const byDay = WEEK_DAY_ORDER.map(() => 0);
    const byTime = { morning: 0, afternoon: 0, night: 0 };

    blockTotals.blocks.forEach((block) => {
      const duration = normalizeNumber(block?.duration_minutes);

      const dayKey = getNormalizedDay(block?.day);
      if (dayKey) {
        const dayIndex = WEEK_DAY_ORDER.indexOf(dayKey);
        if (dayIndex !== -1) {
          byDay[dayIndex] += duration;
        }
      }

      const timeKey = getNormalizedTime(block?.block_time);
      if (timeKey && byTime[timeKey] !== undefined) {
        byTime[timeKey] += duration;
      }
    });

    return {
      minutesByDay: byDay,
      minutesByTime: byTime
    };
  }, [blockTotals.blocks]);

  const minutesByDay = timeDistribution.minutesByDay;
  const minutesByTime = timeDistribution.minutesByTime;

  useEffect(() => {
    if (!userId) {
      lastSnapshotSignatureRef.current = null;
      setAnalytics(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }

    const latestKnown = inMemoryAnalyticsCache.get(userId) || analyticsRef.current;
    setLoading(isCoreLoading && !hasAnyFastAnalyticsData(latestKnown));

    if (isCoreLoading) {
      return;
    }

    const baseAnalytics = {
      ...taskTotals,
      ...habitTotals,
      ...blockTotals,
      minutesByDay,
      minutesByTime
    };

    setAnalytics((prev) => ({
      ...prev,
      ...baseAnalytics
    }));
    inMemoryAnalyticsCache.set(userId, {
      ...analyticsRef.current,
      ...baseAnalytics
    });

    let cancelled = false;
    let timeoutId;
    let idleId;

    const runDeferredCalculations = () => {
      if (cancelled) return;

      const calcStart = performance.now();
      perfLog('analytics_calc_start', {
        userId,
        blocksCount: Array.isArray(blockTotals.blocks) ? blockTotals.blocks.length : 0
      });

      const deferredHistoricalSummary = buildHistoricalSummary(blockTotals.blocks);
      const deferredInsights = buildInsights({
        totalMinutes: blockTotals.totalMinutes,
        completedBlocks: blockTotals.completedBlocks,
        pendingBlocks: blockTotals.pendingBlocks,
        minutesByTime,
        historicalSummary: deferredHistoricalSummary
      });
      const deferredRecommendations = buildRecommendations({
        totalMinutes: blockTotals.totalMinutes,
        completedBlocks: blockTotals.completedBlocks,
        pendingBlocks: blockTotals.pendingBlocks,
        minutesByDay,
        minutesByTime
      });

      if (cancelled) return;

      perfLog('analytics_calc_end', {
        userId,
        durationMs: Number((performance.now() - calcStart).toFixed(2)),
        insightsCount: deferredInsights.length,
        recommendationsCount: deferredRecommendations.length
      });

      const fullAnalytics = {
        ...baseAnalytics,
        historicalSummary: deferredHistoricalSummary,
        insights: deferredInsights,
        recommendations: deferredRecommendations
      };

      setAnalytics((prev) => ({
        ...prev,
        ...fullAnalytics
      }));
      inMemoryAnalyticsCache.set(userId, fullAnalytics);
      prefetchCacheService.set(`analytics-${userId}`, fullAnalytics);

      const snapshotSignature = JSON.stringify({
        userId,
        totalTasks: fullAnalytics.totalTasks,
        completedTasks: fullAnalytics.completedTasks,
        pendingTasks: fullAnalytics.pendingTasks,
        totalHabits: fullAnalytics.totalHabits,
        completedHabits: fullAnalytics.completedHabits,
        totalMinutes: fullAnalytics.totalMinutes,
        completedBlocks: fullAnalytics.completedBlocks,
        pendingBlocks: fullAnalytics.pendingBlocks,
        minutesByDay: fullAnalytics.minutesByDay,
        minutesByTime: fullAnalytics.minutesByTime,
        historicalSummary: fullAnalytics.historicalSummary
      });

      if (lastSnapshotSignatureRef.current === snapshotSignature) {
        return;
      }

      lastSnapshotSignatureRef.current = snapshotSignature;
      saveWeeklySnapshot(userId, fullAnalytics).catch((err) => console.error('Error saving snapshot:', err));
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(runDeferredCalculations, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(runDeferredCalculations, 0);
    }

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && idleId) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [userId, taskTotals, habitTotals, blockTotals, minutesByDay, minutesByTime, isCoreLoading, perfLog]);

  return {
    ...analytics,
    loading
  };
};
