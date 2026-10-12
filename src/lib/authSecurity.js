/**
 * CampusFlow - Security & Authentication Defense Module
 * Implements strict input sanitization, OWASP validation rules,
 * sensitive data masking, and safe error mapping for Supabase Auth.
 */

// RFC 5322 compliant regex for robust email format validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Allowed image MIME types and extensions for avatar uploads
const ALLOWED_AVATAR_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const ALLOWED_AVATAR_EXTENSIONS = Object.freeze([
  'jpg',
  'jpeg',
  'png',
  'webp'
]);

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Strips HTML tags, script entities, and harmful control characters to prevent XSS.
 * @param {string} input 
 * @returns {string} Sanitized string
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep normal printable characters and basic whitespace, drop non-printable control chars
      return (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13;
    })
    .join('')
    .trim();
}

/**
 * Validates and sanitizes an email address.
 * @param {string} email 
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateAndSanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, value: '', error: 'El correo electrónico es requerido.' };
  }

  const sanitized = email.trim().toLowerCase();

  if (sanitized.length > 254) {
    return { isValid: false, value: '', error: 'El correo electrónico supera el límite permitido.' };
  }

  if (!EMAIL_REGEX.test(sanitized)) {
    return { isValid: false, value: '', error: 'Formato de correo electrónico no válido.' };
  }

  return { isValid: true, value: sanitized, error: null };
}

/**
 * Validates password strength according to OWASP guidelines:
 * - Minimum 8 characters
 * - Maximum 72 characters (prevents bcrypt Denial-of-Service)
 * - At least one letter and at least one digit or symbol
 * @param {string} password 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'La contraseña es requerida.' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  }

  if (password.length > 72) {
    return { isValid: false, error: 'La contraseña excede el límite máximo de caracteres.' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9\W]/.test(password);

  if (!hasLetter || !hasNumberOrSymbol) {
    return { isValid: false, error: 'La contraseña debe incluir letras y al menos un número o símbolo.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates and sanitizes a 6-digit TOTP MFA code.
 * @param {string} code 
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateAndSanitizeTotpCode(code) {
  if (!code || typeof code !== 'string') {
    return { isValid: false, value: '', error: 'El código de seguridad es requerido.' };
  }

  const sanitized = code.replace(/\D/g, '').slice(0, 6);

  if (sanitized.length !== 6) {
    return { isValid: false, value: sanitized, error: 'El código debe tener exactamente 6 dígitos.' };
  }

  return { isValid: true, value: sanitized, error: null };
}

/**
 * Validates and sanitizes a user's display name.
 * @param {string} name 
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateAndSanitizeDisplayName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, value: '', error: 'El nombre es requerido.' };
  }

  const sanitized = sanitizeText(name);

  if (sanitized.length < 2) {
    return { isValid: false, value: sanitized, error: 'El nombre debe tener al menos 2 caracteres.' };
  }

  if (sanitized.length > 60) {
    return { isValid: false, value: sanitized.slice(0, 60), error: 'El nombre no puede exceder 60 caracteres.' };
  }

  return { isValid: true, value: sanitized, error: null };
}

/**
 * Validates an avatar image file before upload.
 * Prevents malicious payloads, invalid extensions, and oversized files.
 * @param {File} file 
 * @returns {{ isValid: boolean, error: string | null, safeFileName: string | null }}
 */
export function validateAvatarFile(file, userId) {
  if (!file) {
    return { isValid: false, error: 'No se seleccionó ningún archivo.', safeFileName: null };
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { isValid: false, error: 'El archivo excede el tamaño máximo permitido (5 MB).', safeFileName: null };
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Formato no permitido. Utiliza JPG, PNG o WebP.', safeFileName: null };
  }

  const rawExt = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_AVATAR_EXTENSIONS.includes(rawExt)) {
    return { isValid: false, error: 'Extensión de archivo no permitida.', safeFileName: null };
  }

  // Generate safe filename with UUID and timestamp, preventing directory traversal
  const safeUserId = (userId || 'user').replace(/[^a-zA-Z0-9-]/g, '');
  const safeFileName = `${safeUserId}-${Date.now()}.${rawExt}`;

  return { isValid: true, error: null, safeFileName };
}

/**
 * Safe Error Handler: Maps Supabase API errors and network exceptions
 * to clear, localized, safe messages without exposing technical stack traces
 * or internal architecture details.
 * @param {Error | object | string} error 
 * @param {string} defaultFallback 
 * @returns {string} Safe user-facing error message
 */
export function getSafeAuthErrorMessage(error, defaultFallback = 'Ha ocurrido un error. Por favor intenta de nuevo.') {
  if (!error) return defaultFallback;

  const rawMessage = typeof error === 'string' ? error : error.message || error.error_description || '';
  const normalized = rawMessage.toLowerCase();

  // Authentication credentials
  if (normalized.includes('invalid login credentials') || normalized.includes('invalid_grant')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already exists')) {
    return 'Ya existe una cuenta con este correo electrónico.';
  }

  if (normalized.includes('password should be at least') || normalized.includes('weak_password')) {
    return 'La contraseña no cumple con los requisitos de seguridad.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de ingresar.';
  }

  // MFA / Verification codes
  if (normalized.includes('invalid totp code') || normalized.includes('code is invalid') || normalized.includes('verification failed')) {
    return 'Código de autenticación incorrecto. Verifica el código en tu app e inténtalo de nuevo.';
  }

  if (normalized.includes('factor not found') || normalized.includes('no totp factor')) {
    return 'No se encontró el factor de autenticación configurado.';
  }

  // Rate limiting / Brute force protection
  if (normalized.includes('rate limit') || normalized.includes('too many requests') || normalized.includes('over_request_rate_limit')) {
    return 'Demasiados intentos fallidos por seguridad. Por favor espera unos minutos antes de volver a intentar.';
  }

  // Expired sessions & tokens
  if (normalized.includes('token has expired') || normalized.includes('jwt expired') || normalized.includes('session expired')) {
    return 'Tu sesión o código ha expirado. Por favor ingresa nuevamente.';
  }

  // Network / Connection issues
  if (normalized.includes('failed to fetch') || normalized.includes('network error') || normalized.includes('timeout')) {
    return 'Problemas de conexión con el servidor. Verifica tu conexión a internet.';
  }

  return defaultFallback;
}

/**
 * Safe logger that redacts sensitive keys and suppresses production outputs.
 * @param {'info' | 'warn' | 'error'} level 
 * @param {string} message 
 * @param {Record<string, unknown>} [meta]
 */
export function safeDevLog(level, message, meta) {
  if (!import.meta.env.DEV) return;

  const sanitizedMeta = meta ? { ...meta } : undefined;
  if (sanitizedMeta) {
    if ('access_token' in sanitizedMeta) sanitizedMeta.access_token = '[REDACTED_TOKEN]';
    if ('refresh_token' in sanitizedMeta) sanitizedMeta.refresh_token = '[REDACTED_TOKEN]';
    if ('password' in sanitizedMeta) sanitizedMeta.password = '[REDACTED_PASSWORD]';
    if ('secret' in sanitizedMeta) sanitizedMeta.secret = '[REDACTED_SECRET]';
  }

  if (level === 'error') {
    console.error(`[SEC-AUTH] ${message}`, sanitizedMeta || '');
  } else if (level === 'warn') {
    console.warn(`[SEC-AUTH] ${message}`, sanitizedMeta || '');
  } else {
    console.log(`[SEC-AUTH] ${message}`, sanitizedMeta || '');
  }
}

/**
 * Executes a secure OAuth sign-in with Google via Supabase Auth.
 * Enforces dynamic origin resolution, offline access, and consent prompt.
 * @param {object} supabaseClient 
 * @param {{ origin?: string, redirectTo?: string }} [options]
 * @returns {Promise<{ data: any, error: any }>}
 */
export async function performGoogleOAuthSignIn(supabaseClient, options = {}) {
  if (!supabaseClient || !supabaseClient.auth || typeof supabaseClient.auth.signInWithOAuth !== 'function') {
    throw new Error('Cliente Supabase no configurado o método signInWithOAuth no disponible.');
  }

  const origin = options.origin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
  const redirectUrl = options.redirectTo || (origin ? `${origin}/` : '/');

  return await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
}
