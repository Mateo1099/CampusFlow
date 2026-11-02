import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import { tasksService, TASK_LIST_COLUMNS, TASK_JOINED_PROJECTION, TASK_DETAIL_PROJECTION } from '../lib/tasksService';
import { notesService, NOTE_LIST_COLUMNS, NOTE_DETAIL_COLUMNS, markTasksNotesMigrated } from '../services/notesService';
import { coursesService, COURSE_COLUMNS, COURSE_FALLBACK_COLUMNS } from '../lib/coursesService';
import { getStudySessions, STUDY_SESSION_COLUMNS, STUDY_SESSION_FALLBACK_COLUMNS } from '../services/studySessionService';
import { dataStoreService } from '../lib/dataStoreService';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Auditoría y Optimización de Consultas a Base de Datos (Punto 1 y 7 Bóveda Tech)', () => {
  const mockUserId = 'usr-test-tech-vault-99';
  let mockStorage = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
    const storageMock = {
      getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(mockStorage, key) ? mockStorage[key] : null)),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    };
    globalThis.localStorage = storageMock;
    if (typeof window !== 'undefined') {
      window.localStorage = storageMock;
    }
    markTasksNotesMigrated(mockUserId);
  });

  describe('1. Proyección Estricta de Columnas (Eliminación de select wildcard)', () => {
    it('tasksService.getTasks proyecta estrictamente las columnas requeridas sin select("*")', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 't-1', user_id: mockUserId, title: 'Tarea Rápida', status: 'sin entregar' }],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      await tasksService.getTasks(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(mockQuery.select).toHaveBeenCalledWith(TASK_JOINED_PROJECTION);
      expect(mockQuery.select.mock.calls[0][0]).not.toContain('*');
      expect(mockQuery.select.mock.calls[0][0]).toContain('id, user_id, title, deadline, status, priority, course_id, institution, created_at, updated_at');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('notesService.getNotes proyecta metadatos ligeros reservando el contenido completo para getNoteById', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'n-1', user_id: mockUserId, title: 'Apunte Resumen', course_id: 'c-101' }],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      await notesService.getNotes(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('study_notes');
      expect(mockQuery.select).toHaveBeenCalledWith(NOTE_LIST_COLUMNS);
      expect(mockQuery.select.mock.calls[0][0]).not.toContain('*');
      expect(mockQuery.select.mock.calls[0][0]).toBe('id, user_id, title, course_id, created_at, updated_at');
    });

    it('notesService.getNoteById carga la proyección completa con contenido enriquecido y tags', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'n-full-1',
            user_id: mockUserId,
            title: 'Nota Completa',
            content: '## Contenido Enriquecido en Markdown con fórmulas KaTeX',
            tags: ['Física', 'Termodinámica'],
            created_at: '2026-11-01T10:00:00.000Z',
            updated_at: '2026-11-02T10:00:00.000Z'
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      const note = await notesService.getNoteById('n-full-1', mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('study_notes');
      expect(mockQuery.select).toHaveBeenCalledWith(NOTE_DETAIL_COLUMNS);
      expect(note.content).toContain('Contenido Enriquecido');
      expect(note.tags).toEqual(['Física', 'Termodinámica']);
    });

    it('coursesService.getCourses proyecta id, user_id, name, color, icon, term, created_at sin wildcard', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'crs-1', user_id: mockUserId, name: 'Cálculo Vectorial', color: '#00f3ff', icon: 'calculator', term: '2026-2' }],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      await coursesService.getCourses(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('courses');
      expect(mockQuery.select).toHaveBeenCalledWith(COURSE_COLUMNS);
      expect(mockQuery.select.mock.calls[0][0]).not.toContain('*');
      expect(mockQuery.select.mock.calls[0][0]).toBe('id, user_id, name, color, icon, term, created_at');
    });

    it('coursesService.getCourses aplica fallback transparente si la base de datos no tiene columnas icon o term', async () => {
      const selectMock = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'column "icon" of relation "courses" does not exist' }
          })
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'crs-fb-1', user_id: mockUserId, name: 'Química Orgánica', color: '#10b981' }],
            error: null
          })
        });

      supabase.from.mockReturnValue({ select: selectMock });

      const courses = await coursesService.getCourses(mockUserId);

      expect(selectMock).toHaveBeenCalledTimes(2);
      expect(selectMock.mock.calls[0][0]).toBe(COURSE_COLUMNS);
      expect(selectMock.mock.calls[1][0]).toBe(COURSE_FALLBACK_COLUMNS);
      expect(courses[0].name).toBe('Química Orgánica');
    });

    it('studySessionService.getStudySessions proyecta columnas estrictas id, user_id, course_id, duration_minutes, completed_at, created_at', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [{ id: 'sess-1', user_id: mockUserId, duration_minutes: 25, course_id: 'crs-1' }],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      await getStudySessions(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('study_sessions');
      expect(mockQuery.select).toHaveBeenCalledWith(STUDY_SESSION_COLUMNS);
      expect(mockQuery.select.mock.calls[0][0]).not.toContain('*');
      expect(mockQuery.select.mock.calls[0][0]).toBe('id, user_id, course_id, duration_minutes, completed_at, created_at');
    });
  });

  describe('2. Delimitación de Historial y Parametrización (Punto 7 Bóveda Tech)', () => {
    it('tasksService.getCompletedTasks ordena explícitamente por created_at DESC y aplica límite seguro de 50', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            { id: 't-comp-1', title: 'Entrega Final', status: 'entregado', created_at: '2026-11-02T12:00:00.000Z' }
          ],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      const completed = await tasksService.getCompletedTasks(mockUserId);

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['entregado', 'ENTREGADO']);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      // Límite por defecto de 50 registros (range 0..49)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 49);
      expect(completed.length).toBe(1);
    });

    it('tasksService.getCompletedTasks soporta paginación bajo demanda con page y offset', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null })
      };
      supabase.from.mockReturnValue(mockQuery);

      // Página 3 con tamaño de 25
      await tasksService.getCompletedTasks(mockUserId, { page: 3, limit: 25 });
      // Offset = (3 - 1) * 25 = 50, hasta 50 + 25 - 1 = 74
      expect(mockQuery.range).toHaveBeenCalledWith(50, 74);
    });

    it('studySessionService.getStudySessions ordena explícitamente por created_at DESC y aplica límite seguro de 100 por defecto', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [{ id: 'sess-pomo-1', user_id: mockUserId, duration_minutes: 50 }],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQuery);

      await getStudySessions(mockUserId);

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      // Límite por defecto de 100 registros (range 0..99)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 99);
    });

    it('studySessionService.getStudySessions admite filtro por fecha/periodo activo', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null })
      };
      supabase.from.mockReturnValue(mockQuery);

      await getStudySessions(mockUserId, {
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-02T23:59:59.000Z',
        limit: 30
      });

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2026-11-01T00:00:00.000Z');
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2026-11-02T23:59:59.000Z');
      expect(mockQuery.range).toHaveBeenCalledWith(0, 29);
    });
  });

  describe('3. Compatibilidad con dataStoreService y Estrategia de Caché SWR', () => {
    it('dataStoreService.getCompletedTasks almacena y retorna en memoria con clave parametrizada', async () => {
      const mockTasks = [{ id: 'task-c-10', title: 'Tesis de Grado', status: 'entregado' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockTasks, error: null })
      };
      supabase.from.mockReturnValue(mockQuery);

      const firstCall = await dataStoreService.getCompletedTasks(mockUserId, { limit: 10, page: 1 });
      expect(firstCall).toEqual(mockTasks);

      // Segunda llamada inmediata debe resolver desde memoria en 0 ms
      const secondCall = await dataStoreService.getCompletedTasks(mockUserId, { limit: 10, page: 1 });
      expect(secondCall).toEqual(mockTasks);
      expect(mockQuery.range).toHaveBeenCalledTimes(1);
    });

    it('dataStoreService.getNotes utiliza la proyección ligera y sincroniza localStorage', async () => {
      const mockNotes = [{ id: 'note-ds-1', title: 'Apuntes de Algoritmos', course_id: 'c-alg' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockNotes, error: null })
      };
      supabase.from.mockReturnValue(mockQuery);

      const notes = await dataStoreService.getNotes(mockUserId);
      expect(notes.length).toBeGreaterThanOrEqual(1);

      // Comprueba persistencia en localStorage tier
      const stored = localStorage.getItem(`campusflow_notes_${mockUserId}`);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored).some(n => n.id === 'note-ds-1')).toBe(true);
    });
  });
});
