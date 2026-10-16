import { supabase } from '../lib/supabaseClient';

/**
 * Servicio para invocar el envío de correos transaccionales
 * a través de Supabase Edge Functions.
 */
export const emailService = {
  /**
   * Envía un correo de prueba de alerta transaccional
   * @param {string} email Correo del destinatario
   * @param {string} name Nombre del destinatario
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendTestEmail(email, name = 'Estudiante') {
    const payload = {
      email,
      name,
      subject: 'CampusFlow - Prueba de Alerta',
      message: 'Esta es una prueba de integración del sistema de correos transaccionales de CampusFlow. Si ves esto, significa que el flujo funciona correctamente.'
    };

    try {
      // Intento 1: Edge Function (Deno)
      const { data, error } = await supabase.functions.invoke('send-activity-email', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || 'Error al invocar la función Edge');
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
      return { success: true, messageId: data?.messageId };
    } catch (err) {
      console.warn('[emailService] La Edge Function falló, intentando fallback vía RPC (Base de Datos):', err.message);
      
      try {
        // Fallback: RPC en PostgreSQL usando pg_net
        const { data: rpcData, error: rpcError } = await supabase.rpc('test_email_brevo', {
          p_email: payload.email,
          p_name: payload.name,
          p_subject: payload.subject,
          p_message: payload.message
        });

        if (rpcError) {
          throw new Error(rpcError.message || 'Error al ejecutar RPC test_email_brevo');
        }
        if (rpcData && rpcData.error) {
          throw new Error(rpcData.error);
        }
        
        return { success: true, messageId: 'rpc-' + rpcData?.request_id };
      } catch (fallbackErr) {
        console.error('[emailService] Error total enviando correo de prueba (Edge y RPC fallaron):', fallbackErr);
        return { success: false, error: fallbackErr.message };
      }
    }
  },

  /**
   * Envía una alerta de entregas pendientes del semáforo hacia la Edge Function desacoplada
   * @param {Object} params
   * @param {string} params.email Correo del estudiante
   * @param {string} [params.name] Nombre del estudiante
   * @param {Array<Object>} params.pendingTasks Lista de tareas pendientes
   * @param {string} [params.subject] Asunto opcional
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendDeadlineAlerts({ email, name = 'Estudiante', pendingTasks = [], subject }) {
    const payload = {
      user_email: email,
      student_name: name,
      pending_tasks: pendingTasks,
      ...(subject ? { subject } : {})
    };

    try {
      const { data, error } = await supabase.functions.invoke('send-deadline-alerts', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || 'Error al invocar la función Edge send-deadline-alerts');
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
      return { success: true, messageId: data?.messageId };
    } catch (err) {
      console.warn('[emailService] Edge Function send-deadline-alerts falló, intentando RPC fallback:', err.message);
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('test_send_deadline_alerts_edge', {
          p_email: email
        });
        if (rpcError) throw new Error(rpcError.message);
        return { success: true, messageId: 'rpc-' + (rpcData?.http_request_id || 'ok') };
      } catch (fallbackErr) {
        console.error('[emailService] Error en fallback de sendDeadlineAlerts:', fallbackErr);
        return { success: false, error: fallbackErr.message };
      }
    }
  }
};
