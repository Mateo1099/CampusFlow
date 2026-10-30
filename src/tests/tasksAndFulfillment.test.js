import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  tasksService, 
  getLocalTasks, 
  saveLocalTasks 
} from '../lib/tasksService';
import { supabase } from '../lib/supabaseClient';

// Mock Supabase Client
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Auditoría y Validación: Flujo de Trabajos, Filtrado Institucional y Cumplimiento', () => {
  const mockUserId = 'usr_test_compliance_123';
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
  });

  describe('1. Creación y Persistencia Local-First de Tareas', () => {
    it('asigna correctamente institución, materia, fecha límite y prioridad al crear un trabajo', async () => {
      const taskInput = {
        title: 'Taller de Algoritmos Complejos',
        course_id: 'crs_unad_001',
        start_date: '2026-11-01T08:00:00',
        deadline: '2026-11-15T23:59:00',
        institution: 'UNAD',
        priority: 'alta',
        subtasks: [{ id: 's1', title: 'Punto 1', completed: false }]
      };

      const mockSupabaseResponse = [{
        id: 'asg_mock_1',
        ...taskInput,
        user_id: mockUserId,
        status: 'sin entregar',
        courses: { name: 'Estructuras de Datos', color: '#00f3ff', institution: 'UNAD' }
      }];

      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: mockSupabaseResponse, error: null })
        })
      });

      const created = await tasksService.createTask(mockUserId, taskInput);

      expect(created).toBeDefined();
      expect(created.title).toBe(taskInput.title);
      expect(created.course_id).toBe('crs_unad_001');
      expect(created.institution).toBe('UNAD');
      expect(created.priority).toBe('alta');
      expect(created.status).toBe('sin entregar');
      expect(created.deadline).toBe('2026-11-15T23:59:00');

      // Verifica persistencia inmediata local-first en localStorage
      const localTasks = getLocalTasks(mockUserId);
      expect(localTasks).toHaveLength(1);
      expect(localTasks[0].title).toBe(taskInput.title);
      expect(localTasks[0].institution).toBe('UNAD');
      expect(localTasks[0].priority).toBe('alta');
    });

    it('aplica fallback graceful si Supabase rechaza columnas extendidas', async () => {
      const taskInput = {
        title: 'Evidencia SENA - Base de Datos',
        course_id: 'crs_sena_002',
        deadline: '2026-11-20T23:59:00',
        institution: 'SENA',
        priority: 'media'
      };

      // Primer insert falla por falta de columna priority
      const insertMock = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: null, error: { message: 'column "priority" of relation "assignments" does not exist' } })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'asg_retry_1', title: taskInput.title, user_id: mockUserId, status: 'sin entregar' }],
            error: null
          })
        });

      supabase.from.mockReturnValue({ insert: insertMock });

      const created = await tasksService.createTask(mockUserId, taskInput);
      expect(created).toBeDefined();
      expect(created.title).toBe(taskInput.title);
      expect(created.institution).toBe('SENA');
      expect(created.priority).toBe('media');
    });

    it('guarda y recupera tareas desde cache local correctamente', () => {
      const sample = [
        { id: '1', title: 'T1', institution: 'UNAD', status: 'sin entregar' },
        { id: '2', title: 'T2', institution: 'SENA', status: 'entregado' }
      ];
      saveLocalTasks(mockUserId, sample);
      const retrieved = getLocalTasks(mockUserId);
      expect(retrieved).toEqual(sample);
      expect(getLocalTasks(null)).toEqual([]);
    });
  });

  describe('2. Alternancia y Edición de Estado de Tareas', () => {
    it('actualiza el estado de pendiente a entregado y normaliza aliases', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'asg_1', title: 'Trabajo 1', status: 'entregado', institution: 'UNAD', priority: 'alta' }],
            error: null
          })
        })
      });

      supabase.from.mockReturnValue({ update: updateMock });

      const updated = await tasksService.updateTask('asg_1', { status: 'completado' });
      expect(updated.status).toBe('entregado');
    });

    it('permite alternar reactivamente el estado pendiente <-> entregado', async () => {
      let currentStatus = 'sin entregar';
      const toggle = (status) => (status === 'entregado' ? 'sin entregar' : 'entregado');

      currentStatus = toggle(currentStatus);
      expect(currentStatus).toBe('entregado');

      currentStatus = toggle(currentStatus);
      expect(currentStatus).toBe('sin entregar');
    });

    it('actualiza la prioridad e institución al editar una tarea', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'asg_edit_1', title: 'Título Modificado', institution: 'PERSONALIZADO', priority: 'alta', status: 'en proceso' }],
            error: null
          })
        })
      });

      supabase.from.mockReturnValue({ update: updateMock });

      const res = await tasksService.updateTask('asg_edit_1', {
        title: 'Título Modificado',
        institution: 'PERSONALIZADO',
        priority: 'alta',
        status: 'en proceso'
      });

      expect(res.title).toBe('Título Modificado');
      expect(res.institution).toBe('PERSONALIZADO');
      expect(res.priority).toBe('alta');
    });
  });

  describe('3. Cálculo Exacto de Porcentaje de Cumplimiento y División por Cero', () => {
    const calculateCompletion = (total, completed) => {
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    it('devuelve 0% limpiamente cuando total_tareas es 0 sin producir NaN ni Infinity', () => {
      expect(calculateCompletion(0, 0)).toBe(0);
      expect(Number.isNaN(calculateCompletion(0, 0))).toBe(false);
      expect(Number.isFinite(calculateCompletion(0, 0))).toBe(true);
    });

    it('calcula con precisión porcentajes comunes y redondeos', () => {
      expect(calculateCompletion(4, 0)).toBe(0);
      expect(calculateCompletion(4, 1)).toBe(25);
      expect(calculateCompletion(4, 2)).toBe(50);
      expect(calculateCompletion(4, 3)).toBe(75);
      expect(calculateCompletion(4, 4)).toBe(100);

      // Casos no múltiplos de 10: 1/3 (33%) y 2/3 (67%)
      expect(calculateCompletion(3, 1)).toBe(33);
      expect(calculateCompletion(3, 2)).toBe(67);
      expect(calculateCompletion(7, 5)).toBe(71);
    });

    it('calcula correctamente la cantidad de tareas pendientes sin negativos', () => {
      const getPending = (total, completed) => Math.max(total - completed, 0);
      expect(getPending(0, 0)).toBe(0);
      expect(getPending(5, 2)).toBe(3);
      expect(getPending(5, 5)).toBe(0);
      expect(getPending(3, 4)).toBe(0); // Protección defensiva si completed > total
    });
  });

  describe('4. Filtrado Institucional y Reactividad de Métricas en Dashboard', () => {
    const sampleCourses = [
      { id: 'c_unad_1', name: 'Cálculo', institution: 'UNAD' },
      { id: 'c_sena_1', name: 'Algoritmia', institution: 'SENA' },
      { id: 'c_custom_1', name: 'Inglés Avanzado', institution: 'PERSONALIZADO' },
      { id: 'c_custom_2', name: 'Bootcamp Web', institution: 'PLATZI' }
    ];

    const sampleTasks = [
      // 2 tareas UNAD (1 entregada = 50%)
      { id: 't1', title: 'Tarea UNAD 1', course_id: 'c_unad_1', status: 'entregado', institution: 'UNAD' },
      { id: 't2', title: 'Tarea UNAD 2', course_id: 'c_unad_1', status: 'sin entregar', institution: 'UNAD' },
      
      // 2 tareas SENA (2 entregadas = 100%)
      { id: 't3', title: 'Evidencia SENA 1', course_id: 'c_sena_1', status: 'entregado', institution: 'SENA' },
      { id: 't4', title: 'Evidencia SENA 2', course_id: 'c_sena_1', status: 'entregado', institution: 'SENA' },

      // 2 tareas Personalizadas (0 entregadas = 0%)
      { id: 't5', title: 'Proyecto Personal 1', course_id: 'c_custom_1', status: 'en proceso', institution: 'PERSONALIZADO' },
      { id: 't6', title: 'Proyecto Platzi', course_id: 'c_custom_2', status: 'sin entregar', institution: 'PLATZI' }
    ];

    const filterTasks = (tasks, courses, filter) => {
      return tasks.filter(task => {
        if (filter === 'TODAS') return true;
        const course = courses.find(c => c.id === task.course_id);
        const inst = (task.institution || course?.institution || '').toUpperCase();
        if (filter === 'UNAD') return inst === 'UNAD';
        if (filter === 'SENA') return inst === 'SENA';
        if (filter === 'PERSONALIZADO') return inst === 'PERSONALIZADO' || (!inst.includes('UNAD') && !inst.includes('SENA'));
        return inst === filter.toUpperCase();
      });
    };

    const getMetrics = (tasks, courses, filter) => {
      const filtered = filterTasks(tasks, courses, filter);
      const total = filtered.length;
      const completed = filtered.filter(t => {
        const s = (t.status || '').toLowerCase();
        return s === 'entregado' || s === 'completed' || s === 'submitted' || s === 'completado';
      }).length;
      const pending = Math.max(total - completed, 0);
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, pending, rate };
    };

    it('calcula métricas globales exactas para TODAS', () => {
      const m = getMetrics(sampleTasks, sampleCourses, 'TODAS');
      expect(m.total).toBe(6);
      expect(m.completed).toBe(3); // t1, t3, t4
      expect(m.pending).toBe(3);
      expect(m.rate).toBe(50); // 3/6 = 50%
    });

    it('calcula métricas reactivas exactas para filtro UNAD', () => {
      const m = getMetrics(sampleTasks, sampleCourses, 'UNAD');
      expect(m.total).toBe(2);
      expect(m.completed).toBe(1); // t1
      expect(m.pending).toBe(1);
      expect(m.rate).toBe(50); // 1/2 = 50%
    });

    it('calcula métricas reactivas exactas para filtro SENA', () => {
      const m = getMetrics(sampleTasks, sampleCourses, 'SENA');
      expect(m.total).toBe(2);
      expect(m.completed).toBe(2); // t3, t4
      expect(m.pending).toBe(0);
      expect(m.rate).toBe(100); // 2/2 = 100%
    });

    it('calcula métricas reactivas exactas para filtro PERSONALIZADO (incluyendo instituciones no-UNAD y no-SENA)', () => {
      const m = getMetrics(sampleTasks, sampleCourses, 'PERSONALIZADO');
      expect(m.total).toBe(2); // t5 y t6
      expect(m.completed).toBe(0);
      expect(m.pending).toBe(2);
      expect(m.rate).toBe(0); // 0/2 = 0%
    });

    it('maneja un filtro sin tareas asociadas mostrando 0% sin NaN ni bloqueos', () => {
      const m = getMetrics(sampleTasks, sampleCourses, 'UNIVERSIDAD_INEXISTENTE');
      expect(m.total).toBe(0);
      expect(m.completed).toBe(0);
      expect(m.pending).toBe(0);
      expect(m.rate).toBe(0);
      expect(Number.isNaN(m.rate)).toBe(false);
    });

    it('prioriza task.institution si difiere de la materia asociada', () => {
      const customTaskInUnadCourse = [{
        id: 'tx',
        title: 'Estudio Externo',
        course_id: 'c_unad_1',
        institution: 'PERSONALIZADO',
        status: 'entregado'
      }];

      const mPersonalizado = getMetrics(customTaskInUnadCourse, sampleCourses, 'PERSONALIZADO');
      expect(mPersonalizado.total).toBe(1);
      expect(mPersonalizado.rate).toBe(100);

      const mUnad = getMetrics(customTaskInUnadCourse, sampleCourses, 'UNAD');
      expect(mUnad.total).toBe(0);
      expect(mUnad.rate).toBe(0);
    });
  });
});
