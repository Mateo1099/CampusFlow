/**
 * CampusFlow - Centralized Telemetry & Product Analytics Service
 * Lightweight, non-blocking telemetry engine respecting student privacy.
 * Sanitizes all event payloads via authSecurity to prevent PII / secret leakages,
 * and calculates aggregated performance KPIs.
 */
import { sanitizeText, safeDevLog } from '../lib/authSecurity';

export const TELEMETRY_STORAGE_KEY = 'campusflow_telemetry_events';
export const MAX_STORED_EVENTS = 150;

/**
 * List of sensitive keys that should NEVER be logged or transmitted in telemetry.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'secret',
  'authorization',
  'auth',
  'cookie',
  'apikey',
  'key',
  'session_id',
  'sessionid'
]);

/**
 * Sanitizes telemetry metadata by stripping sensitive keys, tokens, and PII.
 * @param {object} metadata - Raw metadata
 * @returns {object} Safe sanitized metadata
 */
export function sanitizeEventMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const clean = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    // Strip sensitive keys entirely
    if (SENSITIVE_KEYS.has(lowerKey)) {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string') {
      // Check for JWT token pattern or Bearer token
      if (value.startsWith('ey') && value.split('.').length >= 3) {
        continue;
      }
      if (value.toLowerCase().startsWith('bearer ')) {
        continue;
      }
      clean[key] = sanitizeText(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = value
        .filter(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
        .map(item => (typeof item === 'string' ? sanitizeText(item) : item));
    } else if (typeof value === 'object') {
      clean[key] = sanitizeEventMetadata(value);
    }
  }

  return clean;
}

/**
 * Tracks a key user interaction event in a non-blocking, safe manner.
 * @param {string} eventName - Name of the event (e.g. 'task_completed', 'pomodoro_session_finished')
 * @param {object} [metadata={}] - Event metadata
 * @returns {Promise<{ success: boolean, event?: object, error?: string }>}
 */
export function trackEvent(eventName, metadata = {}) {
  // Non-blocking execution to ensure UI rendering is never delayed
  return new Promise((resolve) => {
    const execute = () => {
      try {
        if (!eventName || typeof eventName !== 'string') {
          resolve({ success: false, error: 'Invalid eventName' });
          return;
        }

        const safeMetadata = sanitizeEventMetadata(metadata);
        const eventRecord = {
          name: sanitizeText(eventName),
          metadata: safeMetadata,
          timestamp: Date.now()
        };

        // Dev diagnostic log
        safeDevLog('info', `[Telemetry] Event: ${eventName}`, safeMetadata);

        // Persist to local ring buffer
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
            const events = raw ? JSON.parse(raw) : [];
            events.push(eventRecord);
            if (events.length > MAX_STORED_EVENTS) {
              events.splice(0, events.length - MAX_STORED_EVENTS);
            }
            window.localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events));
          } catch {
            // Storage quota or private mode: fail gracefully without crashing
          }
        }

        // Dispatch custom DOM event for reactive listeners if available
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          try {
            window.dispatchEvent(new CustomEvent('campusflow:telemetry-event', { detail: eventRecord }));
          } catch {
            // Ignore
          }
        }

        resolve({ success: true, event: eventRecord });
      } catch (err) {
        // High resilience: never throw unhandled error
        safeDevLog('warn', `[Telemetry] Error tracking event ${eventName}:`, { message: err?.message });
        resolve({ success: false, error: err?.message });
      }
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(execute);
    } else {
      setTimeout(execute, 0);
    }
  });
}

/**
 * Retrieves persisted telemetry events from local storage.
 * @returns {Array<object>} Stored events
 */
export function getStoredTelemetryEvents() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears stored telemetry events.
 */
export function clearStoredTelemetryEvents() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(TELEMETRY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Calculates aggregated student metrics and performance stats.
 * Computes on-time tasks, Pomodoro focus hours, delivery success rate,
 * and activity streak.
 * @param {object} [options={}]
 * @param {Array<object>} [options.tasks=[]] - Student tasks list
 * @param {Array<number>} [options.minutesByDay=[]] - Minutes studied per day (Mon-Sun)
 * @param {Array<object>} [options.events=[]] - Optional custom events list
 * @returns {object} Aggregated stats
 */
export function getUserStats(options = {}) {
  try {
    const tasks = Array.isArray(options?.tasks) ? options.tasks : [];
    const minutesByDay = Array.isArray(options?.minutesByDay) ? options.minutesByDay : [0, 0, 0, 0, 0, 0, 0];
    const events = Array.isArray(options?.events) ? options.events : getStoredTelemetryEvents();

    const totalTasks = tasks.length;

    // Tareas completadas: estatus 'entregado', 'submitted', 'completado', 'done'
    const completedTasksList = tasks.filter((t) => {
      const st = String(t?.status || '').toLowerCase().trim();
      return st === 'entregado' || st === 'submitted' || st === 'completado' || st === 'done';
    });

    const completedTasksCount = completedTasksList.length;

    // Calcular tareas entregadas a tiempo
    let onTimeCount = 0;
    completedTasksList.forEach((t) => {
      // Si no tiene fecha límite fijada, se considera en tiempo
      if (!t.due_date) {
        onTimeCount += 1;
        return;
      }
      const dueDate = new Date(t.due_date).getTime();
      const completedDate = t.updated_at ? new Date(t.updated_at).getTime() : Date.now();
      // Si la fecha de completado es menor o igual a due_date (o dentro del margen del mismo día)
      if (completedDate <= dueDate || (dueDate - completedDate) >= -86400000) {
        onTimeCount += 1;
      }
    });

    // Tasa de éxito en entregas (% de tareas completadas entregadas a tiempo)
    const deliverySuccessRate = completedTasksCount > 0
      ? Math.min(100, Math.max(0, Math.round((onTimeCount / completedTasksCount) * 100)))
      : 0;

    // Calcular minutos y horas de enfoque Pomodoro
    // 1. A partir de los eventos 'pomodoro_session_finished'
    let pomodoroMinutes = 0;
    let pomodoroSessions = 0;

    events.forEach((evt) => {
      if (evt?.name === 'pomodoro_session_finished') {
        pomodoroSessions += 1;
        const dur = Number(evt?.metadata?.durationMinutes);
        pomodoroMinutes += Number.isFinite(dur) && dur > 0 ? dur : 25;
      }
    });

    // 2. Si no hay eventos locales registrados pero hay minutos semanales en minutesByDay
    const weeklySumMinutes = minutesByDay.reduce((acc, m) => acc + (Number(m) || 0), 0);
    if (pomodoroMinutes === 0 && weeklySumMinutes > 0) {
      pomodoroMinutes = weeklySumMinutes;
    }

    const pomodoroHours = Number((pomodoroMinutes / 60).toFixed(1));

    // Racha activa (días consecutivos con actividad)
    let activeStreak = 0;
    for (let i = minutesByDay.length - 1; i >= 0; i--) {
      if (Number(minutesByDay[i]) > 0) {
        activeStreak += 1;
      } else if (activeStreak > 0) {
        break;
      }
    }

    // Si aún es 0 pero hay sesiones pomodoro o tareas completadas hoy
    if (activeStreak === 0 && (pomodoroSessions > 0 || completedTasksCount > 0)) {
      activeStreak = 1;
    }

    return {
      totalTasks,
      completedTasks: completedTasksCount,
      pendingTasks: Math.max(0, totalTasks - completedTasksCount),
      onTimeTasks: onTimeCount,
      deliverySuccessRate,
      complianceRate: deliverySuccessRate, // Alias para compatibilidad con vistas existentes
      pomodoroMinutes,
      pomodoroHours,
      pomodoroSessions,
      activeStreak,
      weeklyMinutes: weeklySumMinutes
    };
  } catch (err) {
    safeDevLog('error', '[Telemetry] Error calculando getUserStats:', { message: err?.message });
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      onTimeTasks: 0,
      deliverySuccessRate: 0,
      complianceRate: 0,
      pomodoroMinutes: 0,
      pomodoroHours: 0,
      pomodoroSessions: 0,
      activeStreak: 0,
      weeklyMinutes: 0
    };
  }
}

export const analyticsService = {
  trackEvent,
  getUserStats,
  sanitizeEventMetadata,
  getStoredTelemetryEvents,
  clearStoredTelemetryEvents
};

export default analyticsService;
