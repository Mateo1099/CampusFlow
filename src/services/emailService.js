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
  }
};
