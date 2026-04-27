const WEEK_DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIASES = {
  monday: 'monday',
  lunes: 'monday',
  lun: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  martes: 'tuesday',
  mar: 'tuesday',
  tue: 'tuesday',
  wednesday: 'wednesday',
  miercoles: 'wednesday',
  miércoles: 'wednesday',
  mie: 'wednesday',
  mié: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  jueves: 'thursday',
  jue: 'thursday',
  thu: 'thursday',
  friday: 'friday',
  viernes: 'friday',
  vie: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sabado: 'saturday',
  sábado: 'saturday',
  sab: 'saturday',
  sat: 'saturday',
  sunday: 'sunday',
  domingo: 'sunday',
  dom: 'sunday',
  sun: 'sunday'
};

const COMPLETED_TASK_STATUSES = new Set(['entregado', 'submitted', 'completado', 'done']);
const COMPLETED_BLOCK_STATUSES = new Set(['completado', 'completed', 'done']);
const TIME_BUCKETS = ['morning', 'afternoon', 'night'];

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPlannerBlocks = (planners = []) => {
  if (!Array.isArray(planners)) return [];

  return planners.flatMap((planner) => (Array.isArray(planner?.planner_blocks) ? planner.planner_blocks : []));
};

const isCompletedTask = (task) => COMPLETED_TASK_STATUSES.has(normalizeText(task?.status));

const isCompletedBlock = (block) => COMPLETED_BLOCK_STATUSES.has(normalizeText(block?.status));

const getBlockMinutes = (block) => normalizeNumber(block?.duration_minutes);

const getNormalizedDay = (value) => {
  const normalized = normalizeText(value).replace(/_/g, ' ');
  return DAY_ALIASES[normalized] || DAY_ALIASES[normalized.replace(/\s+/g, '')] || null;
};

const getNormalizedTime = (value) => {
  const normalized = normalizeText(value).replace(/_/g, ' ');
  if (normalized === 'mañana' || normalized === 'manana') return 'morning';
  if (normalized === 'tarde') return 'afternoon';
  if (normalized === 'noche') return 'night';
  return TIME_BUCKETS.includes(normalized) ? normalized : null;
};

export const getTotalTasks = (tasks = []) => (Array.isArray(tasks) ? tasks.length : 0);

export const getCompletedTasks = (tasks = []) => (Array.isArray(tasks) ? tasks.filter(isCompletedTask).length : 0);

export const getPendingTasks = (tasks = []) => Math.max(getTotalTasks(tasks) - getCompletedTasks(tasks), 0);

export const getTotalHabits = (habits = []) => (Array.isArray(habits) ? habits.length : 0);

export const getCompletedHabits = (habits = [], habitLogs = []) => {
  if (!Array.isArray(habits) || habits.length === 0) return 0;
  if (!Array.isArray(habitLogs) || habitLogs.length === 0) return 0;

  const habitIds = new Set(habits.map((habit) => String(habit?.id)));
  const completedHabitIds = new Set();

  habitLogs.forEach((log) => {
    const habitId = log?.habit_id ?? log?.habitId;
    if (!habitId) return;

    if (habitIds.size > 0 && !habitIds.has(String(habitId))) return;
    completedHabitIds.add(String(habitId));
  });

  return completedHabitIds.size;
};

export const getTotalPlannedMinutes = (planners = []) => {
  return getPlannerBlocks(planners).reduce((total, block) => total + getBlockMinutes(block), 0);
};

export const getCompletedBlocks = (planners = []) => {
  return getPlannerBlocks(planners).filter(isCompletedBlock).length;
};

export const getPendingBlocks = (planners = []) => {
  const blocks = getPlannerBlocks(planners);
  return Math.max(blocks.length - getCompletedBlocks(planners), 0);
};

export const getMinutesByDay = (planners = []) => {
  const minutesByDay = WEEK_DAY_ORDER.map(() => 0);

  getPlannerBlocks(planners).forEach((block) => {
    const dayKey = getNormalizedDay(block?.day);
    if (!dayKey) return;

    const dayIndex = WEEK_DAY_ORDER.indexOf(dayKey);
    if (dayIndex !== -1) {
      minutesByDay[dayIndex] += getBlockMinutes(block);
    }
  });

  return minutesByDay;
};

export const getMinutesByTime = (planners = []) => {
  const minutesByTime = {
    morning: 0,
    afternoon: 0,
    night: 0
  };

  getPlannerBlocks(planners).forEach((block) => {
    const timeKey = getNormalizedTime(block?.block_time);
    if (!timeKey || minutesByTime[timeKey] === undefined) return;

    minutesByTime[timeKey] += getBlockMinutes(block);
  });

  return minutesByTime;
};

// --- Análisis Histórico Puros ---
export const getBlocksByWeek = (planners = [], targetWeekStartTimestamp) => {
  if (!targetWeekStartTimestamp) return [];
  const blocks = getPlannerBlocks(planners);
  const targetEnd = targetWeekStartTimestamp + 7 * 24 * 60 * 60 * 1000;
  return blocks.filter(b => {
    const dateStr = b.created_at || b.updated_at;
    if (!dateStr) return false;
    const ts = new Date(dateStr).getTime();
    return ts >= targetWeekStartTimestamp && ts < targetEnd;
  });
};

export const getTasksByWeek = (tasks = [], targetWeekStartTimestamp) => {
  if (!targetWeekStartTimestamp) return [];
  const targetEnd = targetWeekStartTimestamp + 7 * 24 * 60 * 60 * 1000;
  return tasks.filter(t => {
    const dateStr = t.created_at || t.updated_at;
    if (!dateStr) return false;
    const ts = new Date(dateStr).getTime();
    return ts >= targetWeekStartTimestamp && ts < targetEnd;
  });
};

export const getWeeklyComparison = (planners = []) => {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  startOfThisWeek.setHours(0, 0, 0, 0);
  const thisWeekTs = startOfThisWeek.getTime();
  const lastWeekTs = thisWeekTs - 7 * 24 * 60 * 60 * 1000;

  const thisWeekBlocks = getBlocksByWeek(planners, thisWeekTs);
  const lastWeekBlocks = getBlocksByWeek(planners, lastWeekTs);

  const thisWeekMinutes = thisWeekBlocks.reduce((acc, b) => acc + getBlockMinutes(b), 0);
  const lastWeekMinutes = lastWeekBlocks.reduce((acc, b) => acc + getBlockMinutes(b), 0);

  return {
    thisWeekBlocks: thisWeekBlocks.length,
    lastWeekBlocks: lastWeekBlocks.length,
    thisWeekMinutes,
    lastWeekMinutes
  };
};

export const getTrendSummary = (planners = []) => {
  const comparison = getWeeklyComparison(planners);
  const diffMinutes = comparison.thisWeekMinutes - comparison.lastWeekMinutes;
  const diffBlocks = comparison.thisWeekBlocks - comparison.lastWeekBlocks;

  let trend = 'stable';
  if (diffMinutes > 0) trend = 'up';
  if (diffMinutes < 0) trend = 'down';

  return {
    semanaActual: {
      minutos: comparison.thisWeekMinutes,
      bloques: comparison.thisWeekBlocks
    },
    semanaAnterior: {
      minutos: comparison.lastWeekMinutes,
      bloques: comparison.lastWeekBlocks
    },
    diferenciaMinutos: diffMinutes,
    diferenciaBloques: diffBlocks,
    tendencia: trend
  };
};

export const generateInsights = (analyticsData) => {
  if (!analyticsData) return [];
  const { totalMinutes, completedBlocks, pendingBlocks, minutesByTime, historicalSummary } = analyticsData;
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

  return insights;
};

export const analyticsService = {
  getTotalTasks,
  getCompletedTasks,
  getPendingTasks,
  getTotalHabits,
  getCompletedHabits,
  getTotalPlannedMinutes,
  getCompletedBlocks,
  getPendingBlocks,
  getMinutesByDay,
  getMinutesByTime,
  getBlocksByWeek,
  getTasksByWeek,
  getWeeklyComparison,
  getTrendSummary,
  generateInsights
};
