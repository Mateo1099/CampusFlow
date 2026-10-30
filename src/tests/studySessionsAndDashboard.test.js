import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  normalizeDurationMinutes, 
  normalizeStudySession, 
  getLocalStudySessions, 
  saveLocalStudySessions, 
  calculateStudyMinutes, 
  saveStudySession, 
  getStudySessions, 
  dispatchStudySessionEvent,
  getStudySessionStorageKey
} from '../services/studySessionService';
import { supabase } from '../lib/supabaseClient';
import Study from '../pages/Study';
import PomodoroTimer from '../components/PomodoroTimer';
import Pomodoro from '../pages/Pomodoro';

// Mock Supabase
vi.mock('../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn()
    }
  };
});

describe('Auditoría y Validación del Modo Estudio y Minutos Totales', () => {
  const mockUserId = 'usr-test-123';
  const otherUserId = 'usr-other-456';
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

    const eventListeners = {};
    const windowMock = {
      localStorage: storageMock,
      addEventListener: vi.fn((event, handler) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter(h => h !== handler);
        }
      }),
      dispatchEvent: vi.fn((event) => {
        const handlers = eventListeners[event.type] || [];
        handlers.forEach(h => h(event));
        return true;
      })
    };
    globalThis.window = windowMock;
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };
  });

  afterEach(() => {
    mockStorage = {};
  });

  describe('1. Normalización y Sanidad de Datos de Sesión', () => {
    it('normalizeDurationMinutes normaliza valores inválidos, negativos, nulos o cadenas sin generar NaN', () => {
      expect(normalizeDurationMinutes(null)).toBe(0);
      expect(normalizeDurationMinutes(undefined)).toBe(0);
      expect(normalizeDurationMinutes(NaN)).toBe(0);
      expect(normalizeDurationMinutes(-15)).toBe(0);
      expect(normalizeDurationMinutes('invalid')).toBe(0);
      expect(normalizeDurationMinutes(0)).toBe(0);
      expect(normalizeDurationMinutes(25)).toBe(25);
      expect(normalizeDurationMinutes('50')).toBe(50);
      expect(normalizeDurationMinutes(45.4)).toBe(45);
      expect(normalizeDurationMinutes(45.6)).toBe(46);
    });

    it('normalizeStudySession asigna id, duración, materia por defecto y marcas de tiempo', () => {
      const raw = {
        user_id: mockUserId,
        durationMinutes: 25,
        courseName: 'Cálculo Multivariable',
        institution: 'Universidad Nacional'
      };

      const normalized = normalizeStudySession(raw);
      expect(normalized.id).toBeDefined();
      expect(normalized.user_id).toBe(mockUserId);
      expect(normalized.duration_minutes).toBe(25);
      expect(normalized.subject).toBe('Cálculo Multivariable');
      expect(normalized.institution).toBe('Universidad Nacional');
      expect(normalized.mode).toBe('focus');
      expect(normalized.created_at).toBeDefined();
    });

    it('normalizeStudySession aplica valores por defecto si se pasan campos vacíos o nulos', () => {
      expect(getStudySessionStorageKey(mockUserId)).toBe(`campusflow_study_sessions_${mockUserId}`);
      const normalized = normalizeStudySession(null, mockUserId);
      expect(normalized.user_id).toBe(mockUserId);
      expect(normalized.duration_minutes).toBe(0);
      expect(normalized.subject).toBe('Estudio Libre');
      expect(normalized.institution).toBeNull();
      expect(normalized.course_id).toBeNull();
    });
  });

  describe('2. Servicio de Persistencia en Supabase (tabla study_sessions) y Cache Local', () => {
    it('saveStudySession persiste exitosamente en Supabase tabla study_sessions y en localStorage', async () => {
      const sessionPayload = {
        user_id: mockUserId,
        duration_minutes: 25,
        course_id: 'course-101',
        subject: 'Física I',
        institution: 'Facultad de Ingeniería',
        task_id: 'task-55',
        method: 'pomodoro',
        mode: 'focus'
      };

      const mockDbResponse = [{ ...sessionPayload, id: 'db-session-1', created_at: new Date().toISOString() }];

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: mockDbResponse, error: null })
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await saveStudySession(sessionPayload, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('study_sessions');
      expect(mockQuery.insert).toHaveBeenCalledWith([expect.objectContaining({
        user_id: mockUserId,
        duration_minutes: 25,
        subject: 'Física I',
        institution: 'Facultad de Ingeniería'
      })]);
      expect(result.success).toBe(true);
      expect(result.localOnly).toBe(false);

      // Verificar que se guardó en localStorage de forma inmediata
      const local = getLocalStudySessions(mockUserId);
      expect(local.length).toBe(1);
      expect(local[0].duration_minutes).toBe(25);
      expect(local[0].subject).toBe('Física I');
      expect(local[0].institution).toBe('Facultad de Ingeniería');
    });

    it('saveStudySession degrada elegantemente a localStorage ante error de Supabase o red', async () => {
      const sessionPayload = {
        user_id: mockUserId,
        duration_minutes: 50,
        subject: 'Estructuras de Datos',
        institution: 'Campus Central'
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'relation study_sessions does not exist' } })
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await saveStudySession(sessionPayload, mockUserId);

      expect(result.success).toBe(true);
      expect(result.localOnly).toBe(true);
      expect(result.data.duration_minutes).toBe(50);
      expect(result.data.subject).toBe('Estructuras de Datos');

      // Comprobar que en localStorage la sesión sigue a salvo
      const local = getLocalStudySessions(mockUserId);
      expect(local.length).toBe(1);
      expect(local[0].duration_minutes).toBe(50);
    });

    it('dispatchStudySessionEvent dispara un CustomEvent para sincronización en tiempo real sin recargar', () => {
      const listener = vi.fn();
      window.addEventListener('campusflow:study-session-saved', listener);

      const testSession = { id: 's-1', user_id: mockUserId, duration_minutes: 30 };
      dispatchStudySessionEvent(testSession);

      expect(listener).toHaveBeenCalled();
      const dispatched = listener.mock.calls[0][0];
      expect(dispatched.detail).toEqual(testSession);

      window.removeEventListener('campusflow:study-session-saved', listener);
    });

    it('getStudySessions obtiene sesiones de Supabase y las fusiona con la caché local', async () => {
      // Guardamos una sesión no sincronizada en local
      saveLocalStudySessions(mockUserId, [
        { id: 'local-only-1', user_id: mockUserId, duration_minutes: 20, subject: 'Historia' }
      ]);

      const remoteSessions = [
        { id: 'remote-1', user_id: mockUserId, duration_minutes: 40, subject: 'Álgebra Lineal' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: remoteSessions, error: null })
      };
      supabase.from.mockReturnValue(mockQuery);

      const merged = await getStudySessions(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('study_sessions');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(merged.length).toBe(2);
      expect(merged.some(s => s.id === 'local-only-1')).toBe(true);
      expect(merged.some(s => s.id === 'remote-1')).toBe(true);
    });

    it('getStudySessions retorna la caché local sin explotar si Supabase rechaza la consulta', async () => {
      saveLocalStudySessions(mockUserId, [
        { id: 'local-only-1', user_id: mockUserId, duration_minutes: 25, subject: 'Química' }
      ]);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network offline' } })
      };
      supabase.from.mockReturnValue(mockQuery);

      const sessions = await getStudySessions(mockUserId);
      expect(sessions.length).toBe(1);
      expect(sessions[0].subject).toBe('Química');
    });
  });

  describe('3. Cálculo de Minutos Totales y Sincronización con Dashboard', () => {
    const sampleSessions = [
      { id: 's1', user_id: mockUserId, duration_minutes: 25, institution: 'UBA', subject: 'Análisis I' },
      { id: 's2', user_id: mockUserId, duration_minutes: 50, institution: 'UBA', subject: 'Álgebra' },
      { id: 's3', user_id: mockUserId, duration_minutes: 15, institution: 'UTN', subject: 'Física' },
      { id: 's4', user_id: mockUserId, duration_minutes: 0, institution: 'UBA', subject: 'Sesión Cancelada' },
      { id: 's5', user_id: mockUserId, duration_minutes: null, institution: 'UBA', subject: 'Dato corrupto' },
      { id: 's6', user_id: mockUserId, duration_minutes: 'invalido', institution: 'UBA', subject: 'Texto' },
      // Sesión de otro usuario (debe aislarse estrictamente)
      { id: 's7', user_id: otherUserId, duration_minutes: 100, institution: 'UBA', subject: 'Sesión Privada Otro' }
    ];

    it('calculateStudyMinutes aísla estrictamente por usuario activo sin sumar datos de terceros', () => {
      const minutesUser1 = calculateStudyMinutes(sampleSessions, { userId: mockUserId });
      expect(minutesUser1).toBe(90); // 25 + 50 + 15

      const minutesUser2 = calculateStudyMinutes(sampleSessions, { userId: otherUserId });
      expect(minutesUser2).toBe(100);
    });

    it('calculateStudyMinutes filtra correctamente por institución seleccionada', () => {
      // Filtro por UBA
      const ubaMinutes = calculateStudyMinutes(sampleSessions, { userId: mockUserId, institution: 'UBA' });
      expect(ubaMinutes).toBe(75); // 25 + 50

      // Filtro por UTN
      const utnMinutes = calculateStudyMinutes(sampleSessions, { userId: mockUserId, institution: 'UTN' });
      expect(utnMinutes).toBe(15);

      // Filtro 'TODAS'
      const allMinutes = calculateStudyMinutes(sampleSessions, { userId: mockUserId, institution: 'TODAS' });
      expect(allMinutes).toBe(90);
    });

    it('calculateStudyMinutes ante valores vacíos, nulos o sesiones de 0 minutos no genera NaN y devuelve 0', () => {
      expect(calculateStudyMinutes([])).toBe(0);
      expect(calculateStudyMinutes(null)).toBe(0);
      expect(calculateStudyMinutes(undefined)).toBe(0);
      expect(calculateStudyMinutes([{ duration_minutes: 0 }])).toBe(0);
      expect(calculateStudyMinutes([{ duration_minutes: null }])).toBe(0);
      expect(calculateStudyMinutes([{ duration_minutes: undefined }])).toBe(0);
      expect(calculateStudyMinutes([{ duration_minutes: -30 }])).toBe(0);
      expect(calculateStudyMinutes([{ duration_minutes: 'not-a-number' }])).toBe(0);

      // Asegurar que el resultado nunca es NaN
      const res = calculateStudyMinutes([
        { duration_minutes: NaN },
        { duration_minutes: 0 },
        { duration_minutes: null }
      ]);
      expect(Number.isNaN(res)).toBe(false);
      expect(res).toBe(0);
    });

    it('Simula la reactividad del Dashboard: actualización instantánea ante nueva sesión', () => {
      // Estado inicial en Dashboard
      let currentSessions = [...sampleSessions.filter(s => s.user_id === mockUserId)];
      let dashboardTotalMinutes = calculateStudyMinutes(currentSessions, { userId: mockUserId });
      expect(dashboardTotalMinutes).toBe(90);

      // El usuario completa una sesión de 25 min en Modo Estudio
      const newCompletedSession = {
        id: 's-new-1',
        user_id: mockUserId,
        duration_minutes: 25,
        institution: 'UBA',
        subject: 'Laboratorio de Algoritmos'
      };

      // Se actualiza el estado en el contexto global
      currentSessions = [newCompletedSession, ...currentSessions];
      dashboardTotalMinutes = calculateStudyMinutes(currentSessions, { userId: mockUserId });

      // Se refleja inmediatamente en el Dashboard sin recargar
      expect(dashboardTotalMinutes).toBe(115);
    });
  });

  describe('4. Interoperabilidad de Componentes y Alias de Modo Estudio', () => {
    it('Study.jsx y PomodoroTimer.jsx exportan correctamente el componente de Pomodoro', () => {
      expect(Study).toBeDefined();
      expect(PomodoroTimer).toBeDefined();
      expect(Study).toBe(Pomodoro);
      expect(PomodoroTimer).toBe(Pomodoro);
    });
  });
});
