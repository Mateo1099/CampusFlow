/**
 * CampusFlow - Study Session Service & Persistence Engine
 * Handles persistence of Pomodoro and Study sessions to Supabase ('study_sessions')
 * with local-first resilience, offline fallback, and reactive updates.
 */

import { supabase } from '../lib/supabaseClient';
import { safeDevLog } from '../lib/authSecurity';

export const STUDY_SESSIONS_STORAGE_PREFIX = 'campusflow_study_sessions_';
export const STUDY_SESSION_COLUMNS = 'id, user_id, course_id, duration_minutes, completed_at, created_at';
export const STUDY_SESSION_FALLBACK_COLUMNS = 'id, user_id, course_id, duration_minutes, created_at';

/**
 * Safely access localStorage without crashing in restricted environments.
 */
function getSafeStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
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
    created_at: raw?.created_at || raw?.completed_at || now,
    completed_at: raw?.completed_at || raw?.created_at || now,
    pending_sync: raw?.pending_sync !== undefined ? Boolean(raw.pending_sync) : false
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
  const effectiveUserId = sessionData?.user_id || sessionData?.userId || userId;
  const normalized = normalizeStudySession(sessionData, effectiveUserId);

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) {
    normalized.pending_sync = true;
  }

  // 1. Guardar de inmediato en local storage para cero latencia y soporte offline
  if (effectiveUserId) {
    const localExisting = getLocalStudySessions(effectiveUserId);
    const updated = [normalized, ...localExisting.filter(s => s.id !== normalized.id)];
    saveLocalStudySessions(effectiveUserId, updated);
  }

  // 2. Disparar evento reactivo en la ventana actual
  dispatchStudySessionEvent(normalized);

  // Si estamos offline, omitir la llamada a Supabase
  if (isOffline) {
    return { success: true, localOnly: true, offline: true, data: normalized };
  }

  // Si no hay usuario activo o es sesión de invitado, no intentar persistir en Supabase
  if (!effectiveUserId || effectiveUserId === 'guest') {
    return { success: true, localOnly: true, data: normalized };
  }

  // 3. Persistir en Supabase
  try {
    const payload = {
      id: normalized.id,
      user_id: effectiveUserId,
      duration_minutes: normalized.duration_minutes,
      course_id: normalized.course_id,
      subject: normalized.subject,
      institution: normalized.institution,
      task_id: normalized.task_id,
      method: normalized.method,
      mode: normalized.mode,
      created_at: normalized.created_at
    };

    let { data, error } = await supabase
      .from('study_sessions')
      .insert([payload])
      .select(STUDY_SESSION_COLUMNS);

    if (error && error.message && error.message.includes('completed_at')) {
      const retryResult = await supabase
        .from('study_sessions')
        .insert([payload])
        .select(STUDY_SESSION_FALLBACK_COLUMNS);
      data = retryResult.data;
      error = retryResult.error;
    }

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
 * Fetches all study sessions for a given user from Supabase with safe historical delimitation,
 * explicit date ordering ('created_at' DESC), strict column projection, and fallback to local cache.
 *
 * @param {string} userId - User identifier
 * @param {object} [options={}] - Query options
 * @param {number} [options.limit=100] - Safe default limit of historical records
 * @param {number} [options.page=1] - Page number for on-demand pagination
 * @param {number} [options.offset] - Specific record offset for pagination
 * @param {string} [options.orderBy='created_at'] - Order field
 * @param {boolean} [options.ascending=false] - Order direction
 */
export async function getStudySessions(userId, options = {}) {
  if (!userId) return [];

  const localSessions = getLocalStudySessions(userId);
  const limit = options.limit !== undefined ? options.limit : 100;
  const page = options.page || 1;
  const offset = options.offset !== undefined ? options.offset : (page - 1) * limit;
  const orderBy = options.orderBy || 'created_at';
  const ascending = options.ascending !== undefined ? options.ascending : false;

  try {
    let query = supabase
      .from('study_sessions')
      .select(STUDY_SESSION_COLUMNS)
      .eq('user_id', userId)
      .order(orderBy, { ascending });

    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (limit > 0) {
      if (typeof query.range === 'function') {
        query = query.range(offset, offset + limit - 1);
      } else if (typeof query.limit === 'function') {
        query = query.limit(limit);
      }
    }

    let { data, error } = await query;

    if (error && error.message && error.message.includes('completed_at')) {
      let retryQuery = supabase
        .from('study_sessions')
        .select(STUDY_SESSION_FALLBACK_COLUMNS)
        .eq('user_id', userId)
        .order(orderBy, { ascending });

      if (limit > 0) {
        if (typeof retryQuery.range === 'function') {
          retryQuery = retryQuery.range(offset, offset + limit - 1);
        } else if (typeof retryQuery.limit === 'function') {
          retryQuery = retryQuery.limit(limit);
        }
      }
      const retryResult = await retryQuery;
      data = retryResult.data;
      error = retryResult.error;
    }

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


/**
 * Sincroniza las sesiones de estudio marcadas con pending_sync hacia Supabase.
 */
export async function syncPendingStudySessions(userId) {
  if (!userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return { syncedCount: 0 };
  }
  const localSessions = getLocalStudySessions(userId);
  const pending = localSessions.filter(s => s.pending_sync === true);
  if (!pending.length) return { syncedCount: 0 };

  let syncedCount = 0;
  const updatedList = [...localSessions];

  for (const session of pending) {
    try {
      const payload = {
        id: session.id,
        user_id: session.user_id || userId,
        duration_minutes: session.duration_minutes,
        course_id: session.course_id || null,
        subject: session.subject || 'Estudio Libre',
        institution: session.institution || null,
        task_id: session.task_id || null,
        method: session.method || 'pomodoro',
        mode: session.mode || 'focus',
        created_at: session.created_at
      };

      const { error } = await supabase
        .from('study_sessions')
        .upsert([payload]);

      if (!error) {
        syncedCount++;
        const idx = updatedList.findIndex(s => s.id === session.id);
        if (idx !== -1) {
          updatedList[idx] = { ...updatedList[idx], pending_sync: false };
        }
      }
    } catch (err) {
      console.warn('[studySessionService] Error sincronizando sesión:', session.id, err?.message);
    }
  }

  saveLocalStudySessions(userId, updatedList);
  return { syncedCount };
}
