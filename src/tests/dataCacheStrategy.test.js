import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataStoreService, CACHE_TTL_MS } from '../lib/dataStoreService';
import { tasksService } from '../lib/tasksService';
import { coursesService } from '../lib/coursesService';

// Mock the services that communicate with Supabase
vi.mock('../lib/tasksService', () => ({
  tasksService: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn()
  },
  getLocalTasks: vi.fn(() => []),
  saveLocalTasks: vi.fn()
}));

vi.mock('../lib/coursesService', () => ({
  coursesService: {
    getCourses: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn()
  },
  getLocalCourses: vi.fn(() => []),
  saveLocalCourses: vi.fn()
}));

vi.mock('../services/studySessionService', () => ({
  getStudySessions: vi.fn(() => Promise.resolve([])),
  getLocalStudySessions: vi.fn(() => []),
  saveLocalStudySessions: vi.fn()
}));

describe('Auditoría e Implementación de Caché en Memoria ("La mesa en la entrada")', () => {
  const mockUserId = 'usr_cache_test_999';

  const mockTasks = [
    { id: 't-1', title: 'Entrega Fase 1 UNAD', institution: 'UNAD', status: 'sin entregar', deadline: '2026-11-10' },
    { id: 't-2', title: 'Taller Algoritmos SENA', institution: 'SENA', status: 'en progreso', deadline: '2026-11-12' },
    { id: 't-3', title: 'Proyecto Personal', institution: 'Personalizado', status: 'entregado', deadline: '2026-11-15' }
  ];

  const mockCourses = [
    { id: 'c-1', name: 'Estructuras de Datos', institution: 'UNAD', color: '#00f3ff' },
    { id: 'c-2', name: 'Bases de Datos', institution: 'SENA', color: '#bc13fe' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    dataStoreService.clearAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    dataStoreService.clearAll();
  });

  describe('1. Consulta y Servido Inmediato ("La mesa en la entrada")', () => {
    it('ejecuta la consulta la primera vez y almacena en caché en memoria con lastFetched', async () => {
      tasksService.getTasks.mockResolvedValueOnce(mockTasks);

      const result = await dataStoreService.getTasks(mockUserId);
      expect(result).toHaveLength(3);
      expect(tasksService.getTasks).toHaveBeenCalledTimes(1);

      // Verificamos que la mesa en la entrada contenga los datos y su timestamp
      const entry = dataStoreService.getCacheEntry('tasks', mockUserId);
      expect(entry).toBeDefined();
      expect(entry.data).toHaveLength(3);
      expect(entry.lastFetched).toBeGreaterThan(0);
      expect(entry.isFresh).toBe(true);
      expect(dataStoreService.hasCachedData('tasks', mockUserId)).toBe(true);
    });

    it('sirve inmediatamente en 0 ms sin re-consultar a Supabase si el TTL está vigente', async () => {
      tasksService.getTasks.mockResolvedValueOnce(mockTasks);

      // Primera llamada: llena la caché
      await dataStoreService.getTasks(mockUserId);
      expect(tasksService.getTasks).toHaveBeenCalledTimes(1);

      // Simulamos que el usuario navega a otra ruta y regresa 2 minutos después (< 4 min TTL)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Segunda llamada: debe servirse de inmediato desde memoria
      const cachedResult = await dataStoreService.getTasks(mockUserId);
      expect(cachedResult).toEqual(mockTasks);
      // tasksService NO debe haber sido llamado una segunda vez
      expect(tasksService.getTasks).toHaveBeenCalledTimes(1);

      // Verificamos lectura síncrona ("La mesa en la entrada")
      const syncData = dataStoreService.getCachedData('tasks', mockUserId);
      expect(syncData).toEqual(mockTasks);
    });
  });

  describe('2. Deduplicación de Peticiones Concurrentes en Vuelo', () => {
    it('reutiliza la misma promesa en vuelo cuando múltiples componentes consultan simultáneamente', async () => {
      let resolvePromise;
      const deferredPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      tasksService.getTasks.mockReturnValueOnce(deferredPromise);

      // 3 componentes o hooks disparan getTasks simultáneamente (ej. TaskBoard + Sidebar + Pomodoro)
      const call1 = dataStoreService.getTasks(mockUserId);
      const call2 = dataStoreService.getTasks(mockUserId);
      const call3 = dataStoreService.getTasks(mockUserId);

      // El servicio solo debió haber sido invocado 1 vez
      expect(tasksService.getTasks).toHaveBeenCalledTimes(1);

      // Resolvemos la promesa
      resolvePromise(mockTasks);
      const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

      expect(res1).toEqual(mockTasks);
      expect(res2).toEqual(mockTasks);
      expect(res3).toEqual(mockTasks);
    });
  });

  describe('3. Estrategia Stale-While-Revalidate tras Expiración del TTL', () => {
    it('retorna inmediatamente los datos obsoletos (0 ms) y revalida silenciosamente en segundo plano', async () => {
      tasksService.getTasks.mockResolvedValueOnce(mockTasks);

      // Primera carga inicial
      await dataStoreService.getTasks(mockUserId);
      expect(tasksService.getTasks).toHaveBeenCalledTimes(1);

      // Avanzamos el reloj 5 minutos (> 4 min TTL)
      vi.advanceTimersByTime(5 * 60 * 1000);

      const entry = dataStoreService.getCacheEntry('tasks', mockUserId);
      expect(entry.isFresh).toBe(false); // Datos marcados como obsoletos (stale)

      const updatedTasksFromSupabase = [
        ...mockTasks,
        { id: 't-4', title: 'Nuevo Parcial UNAD', institution: 'UNAD', status: 'sin entregar', deadline: '2026-11-20' }
      ];
      tasksService.getTasks.mockResolvedValueOnce(updatedTasksFromSupabase);

      // Escuchador de revalidación SWR
      let revalidatedData = null;
      dataStoreService.subscribe('tasks', mockUserId, (fresh) => {
        revalidatedData = fresh;
      });

      // Llamada cuando el TTL expiró: debe devolver INMEDIATAMENTE los 3 datos anteriores (stale)
      const immediateResult = await dataStoreService.getTasks(mockUserId);
      expect(immediateResult).toHaveLength(3);
      expect(tasksService.getTasks).toHaveBeenCalledTimes(2);

      // Esperamos que la revalidación en segundo plano se complete
      await vi.runAllTimersAsync();

      // La caché ahora tiene 4 elementos sin haber bloqueado al usuario con spinners
      const updatedEntry = dataStoreService.getCacheEntry('tasks', mockUserId);
      expect(updatedEntry.data).toHaveLength(4);
      expect(revalidatedData).toHaveLength(4);
    });
  });

  describe('4. Invalidación y Mutación Inmediata (Create / Update / Delete)', () => {
    it('actualiza la caché en memoria y el timestamp inmediatamente al añadir una tarea', () => {
      dataStoreService.setCachedData('tasks', mockUserId, mockTasks);

      const newTask = { id: 't-new', title: 'Nueva Tarea Inmediata', institution: 'UNAD', status: 'sin entregar' };
      dataStoreService.addCachedItem('tasks', mockUserId, newTask);

      const cached = dataStoreService.getCachedData('tasks', mockUserId);
      expect(cached).toHaveLength(4);
      expect(cached[0]).toEqual(newTask);

      const entry = dataStoreService.getCacheEntry('tasks', mockUserId);
      expect(entry.isFresh).toBe(true);
    });

    it('actualiza el estado de una tarea en caché de forma optimista e inmediata', () => {
      dataStoreService.setCachedData('tasks', mockUserId, mockTasks);

      dataStoreService.updateCachedItem('tasks', mockUserId, 't-1', (t) => ({ ...t, status: 'entregado' }));

      const cached = dataStoreService.getCachedData('tasks', mockUserId);
      const updatedTask = cached.find((t) => t.id === 't-1');
      expect(updatedTask.status).toBe('entregado');
    });

    it('elimina un elemento de la caché inmediatamente', () => {
      dataStoreService.setCachedData('tasks', mockUserId, mockTasks);

      dataStoreService.removeCachedItem('tasks', mockUserId, 't-2');

      const cached = dataStoreService.getCachedData('tasks', mockUserId);
      expect(cached).toHaveLength(2);
      expect(cached.find((t) => t.id === 't-2')).toBeUndefined();
    });

    it('actualiza materias (courses) en memoria inmediatamente al registrar o editar', async () => {
      coursesService.getCourses.mockResolvedValueOnce(mockCourses);
      await dataStoreService.getCourses(mockUserId);

      const newCourse = { id: 'c-3', name: 'Arquitectura de Software', institution: 'UNAD', color: '#34c759' };
      dataStoreService.addCachedItem('courses', mockUserId, newCourse);

      const cachedCourses = dataStoreService.getCachedData('courses', mockUserId);
      expect(cachedCourses).toHaveLength(3);
      expect(cachedCourses[0]).toEqual(newCourse);
    });
  });

  describe('5. Coherencia entre Instituciones y Prevención de Fugas de Memoria', () => {
    it('mantiene la coexistencia intacta de instituciones (UNAD, SENA, Personalizado) en una sola estructura', () => {
      dataStoreService.setCachedData('tasks', mockUserId, mockTasks);

      const allTasks = dataStoreService.getCachedData('tasks', mockUserId);
      const unadTasks = allTasks.filter((t) => t.institution === 'UNAD');
      const senaTasks = allTasks.filter((t) => t.institution === 'SENA');
      const personalTasks = allTasks.filter((t) => t.institution === 'Personalizado');

      expect(unadTasks).toHaveLength(1);
      expect(senaTasks).toHaveLength(1);
      expect(personalTasks).toHaveLength(1);

      // Comprobamos que el filtrado de vista no muta el arreglo raíz en memoria
      expect(allTasks).toHaveLength(3);
    });

    it('limpia suscripciones y memoria al invocar clearUserCache sin dejar fugas', () => {
      let callCount = 0;
      const unsubscribe = dataStoreService.subscribe('tasks', mockUserId, () => {
        callCount += 1;
      });

      dataStoreService.setCachedData('tasks', mockUserId, mockTasks);
      expect(callCount).toBe(1);

      // Limpieza de usuario (ej. logout)
      dataStoreService.clearUserCache(mockUserId);

      // Verificamos que no queden rastros en memoria para este usuario
      expect(dataStoreService.getCachedData('tasks', mockUserId)).toBeNull();

      // Una actualización no debe invocar callbacks eliminados
      unsubscribe();
      expect(callCount).toBe(1);
    });
  });
});

