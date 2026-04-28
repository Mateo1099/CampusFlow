import { tasksService } from './tasksService';
import { coursesService } from './coursesService';
import { habitsService } from './habitsService';
import { plannerService } from './plannerService';
import { prefetchCacheService } from './prefetchCacheService';

// Constants from useAnalytics
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
 * Compute analytics from raw data
 * This function contains the same logic as useAnalytics hook
 */
function computeAnalytics(tasks, habits, logs, planners) {
  // Task totals
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => COMPLETED_TASK_STATUSES.has(normalizeText(t?.status))).length : 0;
  const pendingTasks = Math.max(totalTasks - completedTasks, 0);

  // Habit totals
  const totalHabits = Array.isArray(habits) ? habits.length : 0;
  let completedHabits = 0;
  if (Array.isArray(habits) && habits.length > 0 && Array.isArray(logs) && logs.length > 0) {
    const habitIds = new Set(habits.map(h => String(h?.id)));
    const completedHabitIds = new Set();
    logs.forEach(log => {
      const habitId = log?.habit_id ?? log?.habitId;
      if (!habitId) return;
      if (habitIds.size > 0 && !habitIds.has(String(habitId))) return;
      completedHabitIds.add(String(habitId));
    });
    completedHabits = completedHabitIds.size;
  }

  // Planner blocks and block totals
  let blocks = [];
  if (Array.isArray(planners)) {
    blocks = planners.flatMap(planner => (Array.isArray(planner?.planner_blocks) ? planner.planner_blocks : []));
  }

  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter(b => COMPLETED_BLOCK_STATUSES.has(normalizeText(b?.status))).length;
  const totalMinutes = blocks.reduce((total, block) => total + normalizeNumber(block?.duration_minutes), 0);
  const pendingBlocks = Math.max(totalBlocks - completedBlocks, 0);

  // Minutes by day
  const minutesByDay = WEEK_DAY_ORDER.map(() => 0);
  blocks.forEach(block => {
    const dayKey = getNormalizedDay(block?.day);
    if (!dayKey) return;
    const dayIndex = WEEK_DAY_ORDER.indexOf(dayKey);
    if (dayIndex !== -1) {
      minutesByDay[dayIndex] += normalizeNumber(block?.duration_minutes);
    }
  });

  // Minutes by time
  const minutesByTime = { morning: 0, afternoon: 0, night: 0 };
  blocks.forEach(block => {
    const timeKey = getNormalizedTime(block?.block_time);
    if (!timeKey || minutesByTime[timeKey] === undefined) return;
    minutesByTime[timeKey] += normalizeNumber(block?.duration_minutes);
  });

  // Historical summary
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  startOfThisWeek.setHours(0, 0, 0, 0);
  const thisWeekTs = startOfThisWeek.getTime();
  const lastWeekTs = thisWeekTs - 7 * 24 * 60 * 60 * 1000;

  const getBlocksByWeek = (targetTs) => {
    if (!targetTs) return [];
    const targetEnd = targetTs + 7 * 24 * 60 * 60 * 1000;
    return blocks.filter(b => {
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

  const historicalSummary = {
    semanaActual: { minutos: thisWeekMinutes, bloques: thisWeekBlocks.length },
    semanaAnterior: { minutos: lastWeekMinutes, bloques: lastWeekBlocks.length },
    diferenciaMinutos: diffMinutes,
    diferenciaBloques: thisWeekBlocks.length - lastWeekBlocks.length,
    tendencia: trend
  };

  // Insights
  const insights = [];
  const noBlocks = pendingBlocks + completedBlocks === 0;

  if (noBlocks && totalMinutes === 0) {
    insights.push({ id: 'no-activity', type: 'info', message: 'No tienes planificación esta semana.' });
  } else {
    if (pendingBlocks > completedBlocks) {
      insights.push({ id: 'pending-warning', type: 'warning', message: 'Tienes varios bloques pendientes esta semana.' });
    }
    if (totalMinutes < 60 && totalMinutes > 0) {
      insights.push({ id: 'low-plan', type: 'warning', message: 'Tu planificación es muy baja. Intenta agregar más bloques.' });
    }
    if (completedBlocks > pendingBlocks && completedBlocks > 0) {
      insights.push({ id: 'good-job', type: 'success', message: 'Buen trabajo, estás cumpliendo tu planificación.' });
    }
    if (minutesByTime?.morning > (minutesByTime?.afternoon || 0) + (minutesByTime?.night || 0)) {
      insights.push({ id: 'morning-heavy', type: 'info', message: 'Tu carga está concentrada en la mañana. Considera balancear tu día.' });
    }
    if (historicalSummary && historicalSummary.tendencia === 'down') {
      insights.push({ id: 'trend-down', type: 'warning', message: 'Tu actividad bajó respecto a la semana pasada.' });
    }
  }

  // Recommendations
  const recommendations = [];
  const totalBlocksCount = completedBlocks + pendingBlocks;
  const noBlocksData = totalBlocksCount === 0;

  if (!noBlocksData && totalBlocksCount > 0) {
    if (totalMinutes > 0 && totalMinutes < 60) {
      recommendations.push({
        id: 'low-planning',
        priority: 'high',
        title: 'Planificación baja',
        description: 'Tu semana tiene poca carga planificada. Agrega al menos 2 bloques más para tener una guía clara.',
        actionLabel: 'Agregar bloques'
      });
    }
    if (pendingBlocks > completedBlocks && totalBlocksCount > 0) {
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
      const zeroMinutesDays = minutesByDay.filter(m => m === 0).length;
      const hasActivity = minutesByDay.some(m => m > 0);
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
  }

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    totalHabits,
    completedHabits,
    totalMinutes,
    completedBlocks,
    pendingBlocks,
    minutesByDay,
    minutesByTime,
    historicalSummary,
    insights,
    recommendations
  };
}

/**
 * Fetch analytics data needed for the Stats page
 * Fetches tasks, habits, habit logs, and planners data
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

  console.log(`[PREFETCH] Fetching analytics data for user ${userId}`);

  try {
    // Fetch all data in parallel
    // For habit logs, get current day range to match useHabits behavior
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const [tasks, habits, logs, planners] = await Promise.all([
      tasksService.getTasks(userId).catch((err) => {
        console.error('[PREFETCH] Error fetching tasks:', err);
        return [];
      }),
      habitsService.getHabits(userId).catch((err) => {
        console.error('[PREFETCH] Error fetching habits:', err);
        return [];
      }),
      habitsService.getLogs(userId, startOfDay, endOfDay).catch((err) => {
        console.error('[PREFETCH] Error fetching habit logs:', err);
        return [];
      }),
      plannerService.getPlanners(userId).catch((err) => {
        console.error('[PREFETCH] Error fetching planners:', err);
        return [];
      })
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
