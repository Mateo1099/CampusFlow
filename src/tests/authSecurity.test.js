import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  validateAndSanitizeEmail,
  validatePassword,
  validateAndSanitizeTotpCode,
  validateAndSanitizeDisplayName,
  validateAvatarFile,
  getSafeAuthErrorMessage
} from '../lib/authSecurity';

describe('authSecurity - Input Validation & OWASP Protections', () => {
  describe('sanitizeText', () => {
    it('elimina tags HTML y previene inyección de scripts (XSS)', () => {
      const malicious = '<script>alert("XSS")</script>Juan Perez<b>Negrita</b>';
      const clean = sanitizeText(malicious);
      expect(clean).toBe('alert("XSS")Juan PerezNegrita');
      expect(clean).not.toContain('<script>');
    });

    it('elimina caracteres de control peligrosos', () => {
      const inputWithControlChars = 'Usuario\u0000\u001FPrueba';
      expect(sanitizeText(inputWithControlChars)).toBe('UsuarioPrueba');
    });

    it('maneja strings vacíos o tipos no-string de forma segura', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(123)).toBe('');
    });
  });

  describe('validateAndSanitizeEmail', () => {
    it('acepta y normaliza correos válidos a minúsculas y sin espacios', () => {
      const res = validateAndSanitizeEmail('  ESTUDIANTE@CampusFlow.edu  ');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('estudiante@campusflow.edu');
      expect(res.error).toBeNull();
    });

    it('rechaza correos con formato inválido o inyecciones', () => {
      expect(validateAndSanitizeEmail('correo-invalido').isValid).toBe(false);
      expect(validateAndSanitizeEmail('test@.com').isValid).toBe(false);
      expect(validateAndSanitizeEmail('test@campusflow').isValid).toBe(false);
      expect(validateAndSanitizeEmail('<script>@campusflow.com').isValid).toBe(false);
    });

    it('rechaza correos nulos o vacíos', () => {
      expect(validateAndSanitizeEmail('').isValid).toBe(false);
      expect(validateAndSanitizeEmail(null).isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('acepta contraseñas con longitud adecuada y combinación de caracteres', () => {
      expect(validatePassword('Campus2026!').isValid).toBe(true);
      expect(validatePassword('Segura123').isValid).toBe(true);
    });

    it('rechaza contraseñas con menos de 8 caracteres', () => {
      const res = validatePassword('Pass1');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('al menos 8 caracteres');
    });

    it('rechaza contraseñas con más de 72 caracteres para evitar DoS en hashing', () => {
      const longPass = 'A1'.repeat(37); // 74 chars
      const res = validatePassword(longPass);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('límite máximo');
    });

    it('rechaza contraseñas compuestas solo por letras o solo por números', () => {
      expect(validatePassword('sololetrasval').isValid).toBe(false);
      expect(validatePassword('1234567890').isValid).toBe(false);
    });
  });

  describe('validateAndSanitizeTotpCode', () => {
    it('acepta códigos de 6 dígitos numéricos', () => {
      const res = validateAndSanitizeTotpCode('123456');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('123456');
    });

    it('limpia espacios o caracteres no numéricos', () => {
      const res = validateAndSanitizeTotpCode(' 12-34 56 ');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('123456');
    });

    it('rechaza códigos con longitud diferente a 6 dígitos', () => {
      expect(validateAndSanitizeTotpCode('12345').isValid).toBe(false);
      expect(validateAndSanitizeTotpCode('1234567').isValid).toBe(true); // se recorta a 6
      expect(validateAndSanitizeTotpCode('abc').isValid).toBe(false);
    });
  });

  describe('validateAndSanitizeDisplayName', () => {
    it('limpia y valida nombres normales', () => {
      const res = validateAndSanitizeDisplayName('  Mateo Florez  ');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('Mateo Florez');
    });

    it('sanitiza tags script o html en el nombre', () => {
      const res = validateAndSanitizeDisplayName('<img src=x onerror=alert(1)>Carlos');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('Carlos');
    });

    it('rechaza nombres menores a 2 caracteres', () => {
      expect(validateAndSanitizeDisplayName('A').isValid).toBe(false);
      expect(validateAndSanitizeDisplayName('   ').isValid).toBe(false);
    });
  });

  describe('validateAvatarFile', () => {
    it('acepta imágenes válidas dentro de los límites de tamaño', () => {
      const mockFile = {
        name: 'avatar.png',
        type: 'image/png',
        size: 1024 * 500 // 500 KB
      };
      const res = validateAvatarFile(mockFile, 'user-123');
      expect(res.isValid).toBe(true);
      expect(res.safeFileName).toMatch(/^user-123-\d+\.png$/);
    });

    it('rechaza archivos que exceden 5 MB', () => {
      const mockLargeFile = {
        name: 'huge.jpg',
        type: 'image/jpeg',
        size: 6 * 1024 * 1024 // 6 MB
      };
      const res = validateAvatarFile(mockLargeFile, 'user-123');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('5 MB');
    });

    it('rechaza extensiones o tipos MIME no permitidos (ej. .exe, .svg con xss)', () => {
      const mockExe = {
        name: 'malware.exe',
        type: 'application/x-msdownload',
        size: 1024
      };
      expect(validateAvatarFile(mockExe, 'user-123').isValid).toBe(false);

      const mockSvg = {
        name: 'vector.svg',
        type: 'image/svg+xml',
        size: 1024
      };
      expect(validateAvatarFile(mockSvg, 'user-123').isValid).toBe(false);
    });
  });

  describe('getSafeAuthErrorMessage', () => {
    it('traduce credenciales inválidas sin exponer internals', () => {
      const msg = getSafeAuthErrorMessage({ message: 'Invalid login credentials' });
      expect(msg).toBe('Correo o contraseña incorrectos.');
    });

    it('traduce usuario ya existente', () => {
      const msg = getSafeAuthErrorMessage({ message: 'User already registered' });
      expect(msg).toBe('Ya existe una cuenta con este correo electrónico.');
    });

    it('traduce rate limit / protección anti-brute force', () => {
      const msg = getSafeAuthErrorMessage({ message: 'over_request_rate_limit: too many requests' });
      expect(msg).toContain('Demasiados intentos fallidos');
    });

    it('traduce código TOTP inválido de forma limpia', () => {
      const msg = getSafeAuthErrorMessage({ message: 'Invalid TOTP code' });
      expect(msg).toContain('Código de autenticación incorrecto');
    });

    it('mapea errores de creación de usuario en base de datos a un mensaje amigable', () => {
      const dbError = { message: 'Database error saving new user' };
      const safeMsg = getSafeAuthErrorMessage(dbError);
      expect(safeMsg).toBe('Hubo un inconveniente en el servidor al registrar tu cuenta. Por favor verifica tus datos o inténtalo nuevamente.');
    });

    it('oculta trazas de base de datos o PostgreSQL y devuelve mensaje seguro', () => {
      const dbError = { message: 'relation "auth.users" does not exist at character 42 PG::Error' };
      const safeMsg = getSafeAuthErrorMessage(dbError);
      expect(safeMsg).not.toContain('relation "auth.users"');
      expect(safeMsg).not.toContain('PG::Error');
      expect(safeMsg).toBe('Ha ocurrido un error. Por favor intenta de nuevo.');
    });
  });
});
