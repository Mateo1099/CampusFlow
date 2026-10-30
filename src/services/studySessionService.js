/**
 * CampusFlow - Study Session Service & Persistence Engine
 * Handles persistence of Pomodoro and Study sessions to Supabase ('study_sessions')
 * with local-first resilience, offline fallback, and reactive updates.
 */

import { supabase } from '../lib/supabaseClient';
import { safeDevLog } from '../lib/authSecurity';

export const STUDY_SESSIONS_STORAGE_PREFIX = 'campusflow_study_sessions_';

/**
 * Safely access localStorage without crashing in restricted environments.
 */
function getSafeStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

/**
 * Returns the storage key for a user's study sessions.
 */
export function getStudySessionStorageKey(userId) {
  return `${STUDY_SESSIONS_STORAGE_PREFIX}${userId || 'guest'}`;
}

/**
 * Sanitizes and normalizes duration in minutes.
 * Rejects negative numbers, non-finite values, and NaN.
 */
export function normalizeDurationMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.round(parsed);
}

/**
 * Normalizes a raw study session object into a consistent shape.
 */
export function normalizeStudySession(raw, fallbackUserId = null) {
  const now = new Date().toISOString();
  const userId = raw?.user_id || fallbackUserId || null;
  const rawDuration = raw?.duration_minutes ?? raw?.durationMinutes ?? 0;

  return {
    id: raw?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
    user_id: userId,
    duration_minutes: normalizeDurationMinutes(rawDuration),
    course_id: raw?.course_id || raw?.courseId || null,
    subject: raw?.subject || raw?.courseName || 'Estudio Libre',
    institution: raw?.institution || null,
    task_id: raw?.task_id || raw?.taskId || null,
    method: raw?.method || 'pomodoro',
    mode: raw?.mode || 'focus',
    created_at: raw?.created_at || raw?.completed_at || now
  };
}

/**
 * Retrieves cached study sessions from local storage.
 */
export function getLocalStudySessions(userId) {
  const storage = getSafeStorage();
  if (!storage || !userId) return [];

  try {
    const raw = storage.getItem(getStudySessionStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(s => normalizeStudySession(s, userId)) : [];
  } catch (err) {
    safeDevLog('warn', '[studySessionService] Error leyendo sesiones locales:', { message: err?.message });
    return [];
  }
}

/**
 * Persists study sessions to local storage.
 */
export function saveLocalStudySessions(userId, sessions) {
  const storage = getSafeStorage();
  if (!storage || !userId) return;

  try {
    const normalized = (sessions || []).map(s => normalizeStudySession(s, userId));
    storage.setItem(getStudySessionStorageKey(userId), JSON.stringify(normalized));
  } catch (err) {
    safeDevLog('warn', '[studySessionService] Error guardando sesiones locales:', { message: err?.message });
  }
}

/**
 * Dispatches a reactive DOM event so any open tab/component updates immediately.
 */
export function dispatchStudySessionEvent(session) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('campusflow:study-session-saved', { detail: session }));
    } catch {
      // Ignore
    }
  }
}

/**
 * Saves a new study session to Supabase ('study_sessions') and local storage.
 * Gracefully degrades if the database table is unavailable or offline.
 */
export async function saveStudySession(sessionData, userId) {
  const effectiveUserId = sessionData?.user_id || userId;
  const normalized = normalizeStudySession(sessionData, effectiveUserId);

  // 1. Guardar de inmediato en local storage para cero latencia y soporte offline
  if (effectiveUserId) {
    const localExisting = getLocalStudySessions(effectiveUserId);
    const updated = [normalized, ...localExisting.filter(s => s.id !== normalized.id)];
    saveLocalStudySessions(effectiveUserId, updated);
  }

  // 2. Disparar evento reactivo en la ventana actual
  dispatchStudySessionEvent(normalized);

  // 3. Persistir en Supabase
  try {
    const payload = {
      id: normalized.id,
      user_id: normalized.user_id,
      duration_minutes: normalized.duration_minutes,
      course_id: normalized.course_id,
      subject: normalized.subject,
      institution: normalized.institution,
      task_id: normalized.task_id,
      method: normalized.method,
      mode: normalized.mode,
      created_at: normalized.created_at
    };

    const { data, error } = await supabase
      .from('study_sessions')
      .insert([payload])
      .select();

    if (error) {
      safeDevLog('warn', '[studySessionService] Supabase insert falló, sesión guardada localmente:', { error: error.message });
      return { success: true, localOnly: true, data: normalized, error };
    }

    const saved = data && data[0] ? normalizeStudySession(data[0], effectiveUserId) : normalized;
    return { success: true, localOnly: false, data: saved };
  } catch (err) {
    safeDevLog('warn', '[studySessionService] Excepción de conexión a Supabase, sesión en cache:', { message: err?.message });
    return { success: true, localOnly: true, data: normalized, error: err };
  }
}

/**
 * Fetches all study sessions for a given user from Supabase,
 * with fallback and merge from local storage cache.
 */
export async function getStudySessions(userId) {
  if (!userId) return [];

  const localSessions = getLocalStudySessions(userId);

  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      safeDevLog('warn', '[studySessionService] Error leyendo study_sessions en Supabase, usando cache local:', { error: error.message });
      return localSessions;
    }

    const remote = (data || []).map(s => normalizeStudySession(s, userId));

    // Combinar sesiones remotas con locales que aún no hayan sido sincronizadas
    const remoteIds = new Set(remote.map(r => r.id));
    const unsyncedLocal = localSessions.filter(l => !remoteIds.has(l.id));
    const merged = [...unsyncedLocal, ...remote];

    // Actualizar cache local sincronizada
    saveLocalStudySessions(userId, merged);

    return merged;
  } catch (err) {
    safeDevLog('warn', '[studySessionService] Excepción obteniendo study_sessions:', { message: err?.message });
    return localSessions;
  }
}

/**
 * Computes accumulated study minutes safely without generating NaN or blocking the UI.
 * Handles empty arrays, null values, 0 minute sessions, and invalid inputs gracefully.
 *
 * @param {Array<object>} sessions - List of study session records
 * @param {object} [options={}] - Filter criteria
 * @param {string} [options.userId] - Optional user ID filter
 * @param {string} [options.institution] - Optional institution filter ('TODAS' or specific code)
 * @param {string} [options.day] - Optional filter for day of week ('monday', etc.)
 * @param {string} [options.period] - 'all' | 'today' | 'week'
 * @returns {number} Total study minutes (always a non-negative integer, nunca NaN)
 */
export function calculateStudyMinutes(sessions, options = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }

  const { userId, institution, period = 'all' } = options;

  let filtered = sessions;

  // Filtro por usuario activo
  if (userId) {
    filtered = filtered.filter(s => String(s?.user_id) === String(userId));
  }

  // Filtro por institución si aplica
  if (institution && institution.toUpperCase() !== 'TODAS') {
    filtered = filtered.filter(s => {
      const inst = String(s?.institution || '').toUpperCase();
      return inst === institution.toUpperCase();
    });
  }

  // Filtro por período de tiempo si se especifica
  if (period === 'today') {
    const todayStr = new Date().toISOString().split('T')[0];
    filtered = filtered.filter(s => {
      const sessDate = s?.created_at ? String(s.created_at).split('T')[0] : '';
      return sessDate === todayStr;
    });
  } else if (period === 'week') {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTs = startOfWeek.getTime();

    filtered = filtered.filter(s => {
      if (!s?.created_at) return false;
      const ts = new Date(s.created_at).getTime();
      return Number.isFinite(ts) && ts >= startOfWeekTs;
    });
  }

  // Suma segura con cortocircuito contra NaN, undefined, null y 0 minutos
  const total = filtered.reduce((acc, s) => {
    const dur = Number(s?.duration_minutes);
    if (!Number.isFinite(dur) || dur <= 0) {
      return acc;
    }
    return acc + dur;
  }, 0);

  return Math.floor(Number.isFinite(total) && total > 0 ? total : 0);
}
