/**
 * Sanitize & Security Validation Utilities — CampusFlow
 * Módulo centralizado para sanitización de texto académico y validación criptosegura de URLs de entrega.
 */

/**
 * Valida que una URL cumpla estrictamente con el protocolo seguro (https://)
 * y tenga una estructura de dominio válida.
 * 
 * @param {string} rawUrl - URL ingresada por el usuario
 * @returns {{ isValid: boolean, isSecure: boolean, error: string | null, isEmpty: boolean }}
 */
export function validateSecureUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { isValid: true, isSecure: true, error: null, isEmpty: true };
  }

  // Detectar intento de protocolo http no seguro
  if (/^http:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      isSecure: false,
      error: 'Protocolo no seguro (http://). Por seguridad académica, utiliza solo enlaces con "https://"',
      isEmpty: false
    };
  }

  // Exigir que inicie con https://
  if (!/^https:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      isSecure: false,
      error: 'Formato inválido. El enlace de entrega debe iniciar con "https://"',
      isEmpty: false
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return {
        isValid: false,
        isSecure: false,
        error: 'Solo se permiten enlaces con protocolo seguro https://',
        isEmpty: false
      };
    }

    // El host debe contener un punto válido y no terminar en punto
    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.endsWith('.')) {
      return {
        isValid: false,
        isSecure: false,
        error: 'Ingresa un dominio web válido (ej: https://drive.google.com/...)',
        isEmpty: false
      };
    }

    return { isValid: true, isSecure: true, error: null, isEmpty: false };
  } catch (_err) {
    void _err;
    return {
      isValid: false,
      isSecure: false,
      error: 'Formato de URL inválido. Asegúrate de ingresar un enlace web válido.',
      isEmpty: false
    };
  }
}

/**
 * Sanitiza entradas de texto para evitar inyecciones XSS y ejecución no autorizada
 * de scripts o incrustaciones dañinas en apuntes y notas académicas.
 * Preserva fórmulas matemáticas, símbolos de comparación y texto natural.
 * 
 * @param {string} input - Texto del apunte
 * @returns {string} - Texto sanitizado
 */
export function sanitizeNoteInput(input) {
  if (typeof input !== 'string') return '';

  let clean = input;

  // 1. Eliminar etiquetas <script> y su contenido completo
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Eliminar etiquetas <style> y su contenido completo
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 3. Neutralizar etiquetas peligrosas que incrustan contenido externo o inputs manipulables
  clean = clean.replace(/<\/?(iframe|embed|object|form|input|button|meta|link|base|applet)\b[^>]*>/gi, '');

  // 4. Neutralizar manejadores de eventos inline (onerror=, onload=, onclick=, etc.)
  clean = clean.replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\bon\w+\s*=\s*[^>\s]+/gi, '');

  // 5. Neutralizar pseudo-protocolos en URLs peligrosas (javascript:, vbscript:, data:text/html)
  clean = clean.replace(/(javascript|vbscript)\s*:/gi, '$1_blocked:');
  clean = clean.replace(/data\s*:\s*(text\/html|application\/javascript|text\/javascript)/gi, 'data_blocked:$1');

  return clean;
}
