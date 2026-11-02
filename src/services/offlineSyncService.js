/**
 * CampusFlow - Centralized Offline Sync Engine
 * 
 * Coordinates resilient local-first mutations and automatic synchronization
 * across Tasks (assignments), Notes (study_notes), and Study Sessions (study_sessions)
 * when connectivity transitions from offline to online.
 */

import { tasksService } from '../lib/tasksService';
import { notesService } from './notesService';
import { syncPendingStudySessions } from './studySessionService';
import { safeDevLog } from '../lib/authSecurity';

let isSyncing = false;
const syncListeners = new Set();

/**
 * Notifies all subscribers about sync status changes.
 */
function notifySyncListeners(status) {
  syncListeners.forEach(listener => {
    try {
      listener(status);
    } catch (err) {
      console.warn('[offlineSyncService] Error in sync listener:', err);
    }
  });

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('campusflow:sync-status', { detail: status }));
    } catch {
      // Ignore in non-browser environments
    }
  }
}

/**
 * Checks if the current environment is online.
 */
export function isNetworkOnline() {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Synchronizes all pending local mutations (tasks, notes, study sessions) with Supabase.
 * Executes sequentially to prevent transaction contention.
 * 
 * @param {string} userId 
 * @returns {Promise<{ tasksSynced: number, notesSynced: number, sessionsSynced: number, totalSynced: number, success: boolean }>}
 */
export async function syncAllPendingData(userId) {
  if (!userId || !isNetworkOnline() || isSyncing) {
    return { tasksSynced: 0, notesSynced: 0, sessionsSynced: 0, totalSynced: 0, success: false };
  }

  isSyncing = true;
  notifySyncListeners({ isSyncing: true, phase: 'starting', userId });

  safeDevLog('info', '[offlineSyncService] Iniciando sincronización en reconexión...', { userId });

  let tasksSynced = 0;
  let notesSynced = 0;
  let sessionsSynced = 0;

  try {
    // 1. Sincronizar Trabajos / Tareas
    if (typeof tasksService?.syncPendingTasks === 'function') {
      const taskRes = await tasksService.syncPendingTasks(userId);
      tasksSynced = taskRes?.syncedCount || 0;
    }

    // 2. Sincronizar Apuntes
    if (typeof notesService?.syncPendingNotes === 'function') {
      const notesRes = await notesService.syncPendingNotes(userId);
      notesSynced = notesRes?.syncedCount || 0;
    }

    // 3. Sincronizar Sesiones de Estudio / Pomodoro
    if (typeof syncPendingStudySessions === 'function') {
      const sessRes = await syncPendingStudySessions(userId);
      sessionsSynced = sessRes?.syncedCount || 0;
    }

    const totalSynced = tasksSynced + notesSynced + sessionsSynced;
    safeDevLog('info', '[offlineSyncService] Sincronización completada con éxito', {
      tasksSynced,
      notesSynced,
      sessionsSynced,
      totalSynced
    });

    notifySyncListeners({
      isSyncing: false,
      phase: 'completed',
      userId,
      tasksSynced,
      notesSynced,
      sessionsSynced,
      totalSynced
    });

    return {
      tasksSynced,
      notesSynced,
      sessionsSynced,
      totalSynced,
      success: true
    };
  } catch (err) {
    safeDevLog('warn', '[offlineSyncService] Error durante sincronización:', { message: err?.message });
    notifySyncListeners({ isSyncing: false, phase: 'error', error: err?.message, userId });
    return {
      tasksSynced,
      notesSynced,
      sessionsSynced,
      totalSynced: tasksSynced + notesSynced + sessionsSynced,
      success: false,
      error: err?.message
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Subscribes to sync status events.
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export function subscribeSyncStatus(callback) {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

/**
 * Initializes global online/offline event listeners.
 * 
 * @param {Function} getActiveUserId 
 * @returns {Function} Cleanup function
 */
export function initOfflineSync(getActiveUserId) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    const userId = typeof getActiveUserId === 'function' ? getActiveUserId() : null;
    if (userId) {
      syncAllPendingData(userId);
    }
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}

