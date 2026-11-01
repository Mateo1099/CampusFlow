import { toast } from 'sonner';
import { safeDevLog } from './authSecurity';

/**
 * Traduce códigos y mensajes de error de Supabase/red a mensajes humanizados en español.
 * 
 * @param {Error|Object|string} error
 * @param {string} fallbackMessage
 * @returns {string} Mensaje humanizado
 */
export function getHumanizedErrorMessage(error, fallbackMessage = 'No se pudo completar la operación') {
  if (!error) return fallbackMessage;

  const msg = typeof error === 'string' ? error : (error.message || error.error_description || '');
  const code = error.code ? String(error.code) : '';
  const lowerMsg = msg.toLowerCase();

  // Errores de red y conexión
  if (
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('internet') ||
    lowerMsg.includes('offline') ||
    lowerMsg.includes('load failed') ||
    (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && window.navigator.onLine === false)
  ) {
    return 'Sin conexión a internet. Los cambios se sincronizarán al recuperar la conexión.';
  }

  // Sesión y autenticación
  if (
    code === 'PGRST301' ||
    lowerMsg.includes('jwt expired') ||
    lowerMsg.includes('token is expired') ||
    lowerMsg.includes('invalid refresh token') ||
    lowerMsg.includes('session from cookies')
  ) {
    return 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.';
  }

  // Permisos y RLS
  if (
    code === '42501' ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('row-level security') ||
    lowerMsg.includes('rls')
  ) {
    return 'No tienes permisos para realizar esta acción sobre este registro.';
  }

  // Clave duplicada / Conflicto
  if (code === '23505' || lowerMsg.includes('duplicate key') || lowerMsg.includes('unique constraint')) {
    return 'Ya existe un elemento con estos mismos datos.';
  }

  // Llave foránea faltante
  if (code === '23503' || lowerMsg.includes('foreign key constraint')) {
    return 'El elemento relacionado no existe o fue eliminado.';
  }

  // Límite de tamaño o payload
  if (lowerMsg.includes('payload too large') || lowerMsg.includes('entity too large')) {
    return 'El archivo o contenido es demasiado grande para guardarse.';
  }

  return fallbackMessage;
}

/**
 * Maneja excepciones de servicios y peticiones de datos de forma resiliente.
 * En desarrollo emite diagnósticos con safeDevLog sin filtrar secretos.
 * En producción evita emitir trazas crudas a la consola del usuario y muestra
 * un toast humanizado con deduplicación.
 * 
 * @param {Error|Object|string} error
 * @param {Object} options
 * @param {string} [options.fallbackMessage]
 * @param {boolean} [options.showToast=true]
 * @param {string} [options.toastId='service-error']
 * @param {string} [options.context='Service']
 * @returns {string} Mensaje presentado al usuario
 */
export function handleServiceError(error, options = {}) {
  const {
    fallbackMessage = 'Inconveniente al sincronizar con el servidor',
    showToast = true,
    toastId = 'service-error-toast',
    context = 'Service'
  } = options;

  const humanMessage = getHumanizedErrorMessage(error, fallbackMessage);

  // Registro controlado sólo en desarrollo (sin tokens ni secretos)
  safeDevLog('warn', `[${context}] Error capturado de forma resiliente:`, {
    message: typeof error === 'object' ? error?.message : String(error),
    code: error?.code
  });

  // Notificación humanizada vía Sonner Toast
  if (showToast && typeof window !== 'undefined') {
    try {
      toast.error(humanMessage, {
        id: toastId, // Previene toasts duplicados concurrentes
        duration: 4000,
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ffffff',
          backdropFilter: 'blur(16px)'
        }
      });
    } catch {
      // Entornos de prueba donde sonner o DOM no estén completamente montados
    }
  }

  return humanMessage;
}

