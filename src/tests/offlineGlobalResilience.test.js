import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tasksService, getLocalTasks, saveLocalTasks } from '../lib/tasksService';
import { notesService, loadLocalNotes, saveLocalNotes } from '../services/notesService';
import {
  saveStudySession,
  getLocalStudySessions,
  saveLocalStudySessions,
  syncPendingStudySessions
} from '../services/studySessionService';
import {
  syncAllPendingData,
  isNetworkOnline,
  subscribeSyncStatus
} from '../services/offlineSyncService';
import { supabase } from '../lib/supabaseClient';

const setNetworkOnline = (status) => {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    value: Boolean(status),
    configurable: true,
    writable: true
  });
};

describe('offlineGlobalResilience - Soporte y Resiliencia Offline Global', () => {
  let mockStorage = {};
  const initialOnLine = globalThis.navigator?.onLine;

  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();

    // Mock localStorage
    globalThis.localStorage = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => { mockStorage[key] = String(value); }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; }),
      key: vi.fn((idx) => Object.keys(mockStorage)[idx] || null),
      get length() {
        return Object.keys(mockStorage).length;
      }
    };

    // Mock Supabase from
    supabase.from = vi.fn().mockImplementation(() => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id' }], error: null }),
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id' }], error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };
      return queryBuilder;
    });
  });

  afterEach(() => {
    if (initialOnLine !== undefined) {
      setNetworkOnline(initialOnLine);
    }
  });

  describe('1. Alternancia reactiva de estados online y offline', () => {
    it('detecta correctamente el estado de conexión según navigator.onLine', () => {
      setNetworkOnline(true);
      expect(isNetworkOnline()).toBe(true);

      setNetworkOnline(false);
      expect(isNetworkOnline()).toBe(false);
    });

    it('notifica a los suscriptores cuando se ejecuta una sincronización', async () => {
      setNetworkOnline(true);
      const statusUpdates = [];
      const unsubscribe = subscribeSyncStatus((status) => statusUpdates.push(status));

      await syncAllPendingData('user-test-123');

      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0].isSyncing).toBe(true);
      expect(statusUpdates[statusUpdates.length - 1].isSyncing).toBe(false);
      expect(statusUpdates[statusUpdates.length - 1].phase).toBe('completed');

      unsubscribe();
    });
  });

  describe('2. Guardado local de Tareas con pending_sync cuando no hay red', () => {
    it('persiste la tarea en local-first con pending_sync: true y omite peticiones a Supabase', async () => {
      setNetworkOnline(false);
      const userId = 'usr-offline-tasks';

      const taskToCreate = {
        title: 'Entrega Fase 3 Algoritmos',
        status: 'sin entregar',
        priority: 'alta',
        institution: 'UNAD'
      };

      const result = await tasksService.createTask(userId, taskToCreate);

      expect(result).toBeDefined();
      expect(result.pending_sync).toBe(true);
      expect(result.title).toBe('Entrega Fase 3 Algoritmos');

      // Verificar que Supabase.from no fue invocado para insert en modo offline
      expect(supabase.from).not.toHaveBeenCalled();

      // Verificar persistencia local
      const savedTasks = getLocalTasks(userId);
      expect(savedTasks.length).toBe(1);
      expect(savedTasks[0].pending_sync).toBe(true);
      expect(savedTasks[0].title).toBe('Entrega Fase 3 Algoritmos');
    });

    it('marca pending_sync: true al actualizar tareas en modo offline', async () => {
      setNetworkOnline(false);
      const userId = 'usr-offline-update';
      const existingTask = {
        id: 'task-101',
        title: 'Diseño Base de Datos',
        status: 'en proceso',
        user_id: userId,
        pending_sync: false
      };
      saveLocalTasks(userId, [existingTask]);

      const updated = await tasksService.updateTask('task-101', { status: 'entregado' }, userId);

      expect(updated.status).toBe('entregado');
      expect(updated.pending_sync).toBe(true);

      const localTasks = getLocalTasks(userId);
      expect(localTasks[0].status).toBe('entregado');
      expect(localTasks[0].pending_sync).toBe(true);
    });
  });

  describe('3. Guardado local de Apuntes (Notes) con pending_sync cuando no hay red', () => {
    it('guarda el apunte en local con pending_sync: true sin llamar a Supabase', async () => {
      setNetworkOnline(false);
      const userId = 'usr-offline-notes';

      const noteData = {
        title: 'Fórmulas de Cálculo Integral',
        content: 'Integración por partes: u*v - int(v*du)',
        tags: ['Matemáticas', 'UNAD']
      };

      const newNote = await notesService.createNote(userId, noteData);

      expect(newNote).toBeDefined();
      expect(newNote.pending_sync).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();

      const localNotes = loadLocalNotes(userId);
      expect(localNotes.length).toBeGreaterThanOrEqual(1);
      expect(localNotes[0].pending_sync).toBe(true);
      expect(localNotes[0].title).toBe('Fórmulas de Cálculo Integral');
    });

    it('marca pending_sync: true al actualizar un apunte offline', async () => {
      setNetworkOnline(false);
      const userId = 'usr-offline-notes-edit';
      const initialNote = {
        id: 'note-55',
        title: 'Resumen Inicial',
        content: 'Contenido viejo',
        user_id: userId,
        pending_sync: false
      };
      saveLocalNotes(userId, [initialNote]);

      const updated = await notesService.updateNote('note-55', { content: 'Contenido editado offline' }, userId);

      expect(updated.content).toBe('Contenido editado offline');
      expect(updated.pending_sync).toBe(true);

      const localNotes = loadLocalNotes(userId);
      expect(localNotes[0].pending_sync).toBe(true);
      expect(localNotes[0].content).toBe('Contenido editado offline');
    });
  });

  describe('4. Guardado local de Sesiones de Estudio con pending_sync cuando no hay red', () => {
    it('persiste la sesión localmente y retorna offline: true sin consultar Supabase', async () => {
      setNetworkOnline(false);
      const userId = 'usr-offline-study';

      const session = {
        duration_minutes: 50,
        subject: 'Estructuras de Datos',
        method: 'pomodoro'
      };

      const res = await saveStudySession(session, userId);

      expect(res.success).toBe(true);
      expect(res.offline).toBe(true);
      expect(res.data.pending_sync).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();

      const savedSessions = getLocalStudySessions(userId);
      expect(savedSessions.length).toBe(1);
      expect(savedSessions[0].duration_minutes).toBe(50);
      expect(savedSessions[0].pending_sync).toBe(true);
    });
  });

  describe('5. Resolución de Sincronización en Reconexión (evento Online)', () => {
    it('sincroniza secuencialmente tareas pendientes y actualiza el flag local', async () => {
      setNetworkOnline(true);
      const userId = 'usr-sync-ready';

      // Sembrar 2 tareas pendientes
      saveLocalTasks(userId, [
        { id: 'task-sync-1', title: 'Tarea 1', status: 'sin entregar', pending_sync: true, user_id: userId },
        { id: 'task-sync-2', title: 'Tarea 2', status: 'entregado', pending_sync: true, user_id: userId }
      ]);

      const syncResult = await tasksService.syncPendingTasks(userId);

      expect(syncResult.syncedCount).toBe(2);
      expect(supabase.from).toHaveBeenCalledWith('assignments');

      // Verificar que el flag pending_sync pasó a false
      const remainingTasks = getLocalTasks(userId);
      expect(remainingTasks.every(t => t.pending_sync === false)).toBe(true);
    });

    it('sincroniza secuencialmente apuntes y sesiones de estudio pendientes', async () => {
      setNetworkOnline(true);
      const userId = 'usr-sync-notes-sess';

      saveLocalNotes(userId, [
        { id: 'note-sync-1', title: 'Nota Offline', content: 'Contenido', pending_sync: true, user_id: userId }
      ]);

      saveLocalStudySessions(userId, [
        { id: 'sess-sync-1', duration_minutes: 25, subject: 'Física', pending_sync: true, user_id: userId }
      ]);

      const noteSync = await notesService.syncPendingNotes(userId);
      const sessSync = await syncPendingStudySessions(userId);

      expect(noteSync.syncedCount).toBe(1);
      expect(sessSync.syncedCount).toBe(1);

      expect(loadLocalNotes(userId)[0].pending_sync).toBe(false);
      expect(getLocalStudySessions(userId)[0].pending_sync).toBe(false);
    });

    it('syncAllPendingData coordina y totaliza la sincronización de todas las entidades', async () => {
      setNetworkOnline(true);
      const userId = 'usr-sync-all';

      saveLocalTasks(userId, [
        { id: 't-all-1', title: 'Tarea A', status: 'sin entregar', pending_sync: true, user_id: userId }
      ]);
      saveLocalNotes(userId, [
        { id: 'n-all-1', title: 'Nota A', content: 'C', pending_sync: true, user_id: userId }
      ]);
      saveLocalStudySessions(userId, [
        { id: 's-all-1', duration_minutes: 30, subject: 'Historia', pending_sync: true, user_id: userId }
      ]);

      const result = await syncAllPendingData(userId);

      expect(result.success).toBe(true);
      expect(result.tasksSynced).toBe(1);
      expect(result.notesSynced).toBe(1);
      expect(result.sessionsSynced).toBe(1);
      expect(result.totalSynced).toBe(3);
    });
  });
});
