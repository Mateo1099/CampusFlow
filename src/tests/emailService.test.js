import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emailService } from '../services/emailService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('emailService — Decoupled Email Edge Function Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendDeadlineAlerts', () => {
    it('invoca exitosamente la Edge Function send-deadline-alerts con payload estructurado', async () => {
      supabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, messageId: 'msg-resend-123', recipient: 'estudiante@campusflow.app' },
        error: null,
      });

      const sampleTasks = [
        {
          id: 'task-1',
          title: 'Entrega Final de Algoritmos',
          deadline: '2026-10-17T23:59:59Z',
          days_left: 0,
          alert_type: 'rojo',
          course: 'Algoritmos y Estructuras',
        },
        {
          id: 'task-2',
          title: 'Laboratorio de Bases de Datos',
          deadline: '2026-10-19T23:59:59Z',
          days_left: 2,
          alert_type: 'amarillo',
          course: 'Bases de Datos',
        },
      ];

      const result = await emailService.sendDeadlineAlerts({
        email: 'estudiante@campusflow.app',
        name: 'Mateo Trujillo',
        pendingTasks: sampleTasks,
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-resend-123');

      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-deadline-alerts', {
        body: {
          user_email: 'estudiante@campusflow.app',
          student_name: 'Mateo Trujillo',
          pending_tasks: sampleTasks,
        },
      });
      // No debió llamar al fallback RPC
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('ejecuta fallback vía RPC si la Edge Function falla o está inaccesible', async () => {
      supabase.functions.invoke.mockRejectedValueOnce(new Error('Network connection timeout'));
      supabase.rpc.mockResolvedValueOnce({
        data: { success: true, http_request_id: 8842 },
        error: null,
      });

      const result = await emailService.sendDeadlineAlerts({
        email: 'estudiante@campusflow.app',
        name: 'Mateo Trujillo',
        pendingTasks: [{ title: 'Tarea Crítica', days_left: 1, alert_type: 'rojo' }],
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('rpc-8842');
      expect(supabase.rpc).toHaveBeenCalledWith('test_send_deadline_alerts_edge', {
        p_email: 'estudiante@campusflow.app',
      });
    });

    it('maneja errores totales de forma resiliente sin lanzar excepciones no controladas', async () => {
      supabase.functions.invoke.mockRejectedValueOnce(new Error('Edge down'));
      supabase.rpc.mockRejectedValueOnce(new Error('RPC function not found in DB'));

      const result = await emailService.sendDeadlineAlerts({
        email: 'estudiante@campusflow.app',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('RPC function not found in DB');
    });
  });

  describe('sendTestEmail', () => {
    it('envía correo de prueba a través de send-activity-email', async () => {
      supabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, messageId: 'test-msg-001' },
        error: null,
      });

      const result = await emailService.sendTestEmail('test@campusflow.app', 'Tester');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-msg-001');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-activity-email', expect.any(Object));
    });
  });
});
