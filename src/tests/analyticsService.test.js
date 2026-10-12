import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackEvent,
  getUserStats,
  sanitizeEventMetadata,
  clearStoredTelemetryEvents,
  getStoredTelemetryEvents,
  TELEMETRY_STORAGE_KEY
} from '../services/analyticsService';

describe('Centralized Telemetry & Product Analytics Service', () => {
  let mockStorage = {};
  let originalWindow = globalThis.window;

  beforeEach(() => {
    mockStorage = {};

    globalThis.window = {
      localStorage: {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, value) => {
          mockStorage[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          mockStorage = {};
        })
      },
      dispatchEvent: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  describe('1. Sanitización Estricta de Metadata (OWASP & PII Protection)', () => {
    it('elimina contraseñas, tokens JWT, secrets y headers de autorización', () => {
      const maliciousPayload = {
        taskId: 'task-999',
        title: 'Estudio de Redes',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN72bV1NYmO_43m4m',
        access_token: 'acctok_12345',
        refresh_token: 'reftok_67890',
        secret: 'api_secret_key_abcdef',
        authorization: 'Bearer token_abc_123',
        auth: 'basic dXNlcjpwYXNz',
        safeCategory: 'academico'
      };

      const sanitized = sanitizeEventMetadata(maliciousPayload);

      expect(sanitized.taskId).toBe('task-999');
      expect(sanitized.title).toBe('Estudio de Redes');
      expect(sanitized.safeCategory).toBe('academico');

      // Claves sensibles completamente omitidas
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.access_token).toBeUndefined();
      expect(sanitized.refresh_token).toBeUndefined();
      expect(sanitized.secret).toBeUndefined();
      expect(sanitized.authorization).toBeUndefined();
      expect(sanitized.auth).toBeUndefined();
    });

    it('elimina valores tipo string que contengan estructura JWT o Bearer aunque la clave sea genérica', () => {
      const payloadWithHiddenToken = {
        payload_data: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        authHeaderValue: 'Bearer sensitive_credentials_xyz',
        normalData: 'Cálculo Vectorial'
      };

      const sanitized = sanitizeEventMetadata(payloadWithHiddenToken);

      expect(sanitized.payload_data).toBeUndefined();
      expect(sanitized.authHeaderValue).toBeUndefined();
      expect(sanitized.normalData).toBe('Cálculo Vectorial');
    });

    it('limpia etiquetas HTML y secuencias script de los valores string', () => {
      const xssPayload = {
        title: '<script>alert("xss")</script>Entrega Final<b>Física</b>',
        description: 'Examen <img src=x onerror=alert(1)>'
      };

      const sanitized = sanitizeEventMetadata(xssPayload);

      expect(sanitized.title).not.toContain('<script>');
      expect(sanitized.title).toBe('alert("xss")Entrega FinalFísica');
    });

    it('maneja con solidez valores null, undefined, strings o tipos no-objeto', () => {
      expect(sanitizeEventMetadata(null)).toEqual({});
      expect(sanitizeEventMetadata(undefined)).toEqual({});
      expect(sanitizeEventMetadata('string-invalido')).toEqual({});
      expect(sanitizeEventMetadata([1, 2, 3])).toEqual({});
    });
  });

  describe('2. Tolerancia a Fallos y Ejecución No Bloqueante (trackEvent)', () => {
    it('registra eventos y los persiste de forma asíncrona sin bloquear la UI', async () => {
      const result = await trackEvent('task_completed', {
        taskId: 't-101',
        status: 'entregado'
      });

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.name).toBe('task_completed');
      expect(result.event.metadata.taskId).toBe('t-101');
      expect(mockStorage[TELEMETRY_STORAGE_KEY]).toBeDefined();

      const stored = getStoredTelemetryEvents();
      expect(stored.length).toBeGreaterThanOrEqual(1);
      expect(stored[stored.length - 1].name).toBe('task_completed');
    });

    it('no rompe la aplicación si localStorage lanza un error de cuota o está restringido', async () => {
      globalThis.window.localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Debe resolver limpiamente sin lanzar excepciones no controladas
      const result = await trackEvent('theme_switched', { theme: 'cyber' });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('rechaza nombres de evento inválidos sin colapsar', async () => {
      const result = await trackEvent(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid eventName');
    });

    it('permite limpiar el historial de telemetría de forma segura', async () => {
      await trackEvent('login_success', { method: 'google_oauth' });
      clearStoredTelemetryEvents();
      expect(getStoredTelemetryEvents()).toEqual([]);
    });
  });

  describe('3. Cálculo Matemático de Métricas y Estadísticas (getUserStats)', () => {
    it('calcula correctamente la tasa de éxito en entregas a tiempo (deliverySuccessRate)', () => {
      const mockTasks = [
        {
          id: '1',
          status: 'entregado',
          due_date: '2026-10-15T23:59:59.000Z',
          updated_at: '2026-10-14T10:00:00.000Z' // A tiempo
        },
        {
          id: '2',
          status: 'entregado',
          due_date: '2026-10-10T12:00:00.000Z',
          updated_at: '2026-10-09T08:00:00.000Z' // A tiempo
        },
        {
          id: '3',
          status: 'entregado',
          due_date: '2026-10-01T12:00:00.000Z',
          updated_at: '2026-10-05T18:00:00.000Z' // Tardía (> 24h después)
        },
        {
          id: '4',
          status: 'pendiente', // No completada
          due_date: '2026-10-20T12:00:00.000Z'
        }
      ];

      const stats = getUserStats({ tasks: mockTasks });

      expect(stats.totalTasks).toBe(4);
      expect(stats.completedTasks).toBe(3);
      expect(stats.pendingTasks).toBe(1);
      expect(stats.onTimeTasks).toBe(2);
      // 2 a tiempo de 3 completadas = 66.67% -> 67%
      expect(stats.deliverySuccessRate).toBe(67);
      expect(stats.complianceRate).toBe(67);
    });

    it('calcula horas de enfoque Pomodoro a partir de sesiones registradas', () => {
      const mockEvents = [
        { name: 'pomodoro_session_finished', metadata: { durationMinutes: 25 } },
        { name: 'pomodoro_session_finished', metadata: { durationMinutes: 25 } },
        { name: 'pomodoro_session_finished', metadata: { durationMinutes: 50 } },
        { name: 'other_event', metadata: {} }
      ];

      const stats = getUserStats({
        tasks: [],
        events: mockEvents
      });

      expect(stats.pomodoroSessions).toBe(3);
      expect(stats.pomodoroMinutes).toBe(100);
      // 100 min / 60 = 1.666 -> 1.7h
      expect(stats.pomodoroHours).toBe(1.7);
    });

    it('calcula la racha activa (activeStreak) basada en los días con estudio', () => {
      // Semana Lun-Dom: actividad Jue(60), Vie(45), Sab(0), Dom(30) -> racha de 1 día (Dom)
      const minutesByDay = [0, 0, 0, 60, 45, 0, 30];

      const stats = getUserStats({
        tasks: [],
        minutesByDay
      });

      expect(stats.activeStreak).toBe(1);

      // Si los últimos 3 días (Vie, Sab, Dom) tienen minutos:
      const consecutiveDays = [0, 0, 0, 0, 45, 60, 90];
      const statsConsecutive = getUserStats({ tasks: [], minutesByDay: consecutiveDays });
      expect(statsConsecutive.activeStreak).toBe(3);
    });

    it('soporta entradas nulas o datos corruptos sin lanzar excepciones', () => {
      const corruptedStats = getUserStats(null);

      expect(corruptedStats).toBeDefined();
      expect(corruptedStats.totalTasks).toBe(0);
      expect(corruptedStats.completedTasks).toBe(0);
      expect(corruptedStats.deliverySuccessRate).toBe(0);
      expect(corruptedStats.pomodoroHours).toBe(0);
      expect(corruptedStats.activeStreak).toBe(0);

      const invalidArrayStats = getUserStats({ tasks: 'not-an-array', minutesByDay: null });
      expect(invalidArrayStats.totalTasks).toBe(0);
      expect(invalidArrayStats.deliverySuccessRate).toBe(0);
    });
  });
});
