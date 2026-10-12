import { describe, it, expect } from 'vitest';
import {
  validateAndSanitizeTotpCode,
  getSafeAuthErrorMessage
} from '../lib/authSecurity';

describe('OTP Verification Security & Orbital Logic Specifications', () => {
  describe('validateAndSanitizeTotpCode', () => {
    it('acepta códigos de 6 dígitos numéricos estándar', () => {
      const res = validateAndSanitizeTotpCode('123456');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('123456');
      expect(res.error).toBeNull();
    });

    it('limpia espacios, guiones y caracteres no numéricos', () => {
      const res = validateAndSanitizeTotpCode(' 12-34 56 ');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('123456');
      expect(res.error).toBeNull();
    });

    it('trunca a los primeros 6 dígitos numéricos si se envían más de 6', () => {
      const res = validateAndSanitizeTotpCode('123456789');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe('123456');
    });

    it('rechaza códigos con menos de 6 dígitos numéricos', () => {
      const res = validateAndSanitizeTotpCode('12345');
      expect(res.isValid).toBe(false);
      expect(res.value).toBe('12345');
      expect(res.error).toContain('6 dígitos');
    });

    it('rechaza entradas nulas, vacías o que no sean strings', () => {
      expect(validateAndSanitizeTotpCode('').isValid).toBe(false);
      expect(validateAndSanitizeTotpCode(null).isValid).toBe(false);
      expect(validateAndSanitizeTotpCode(undefined).isValid).toBe(false);
      expect(validateAndSanitizeTotpCode(123456).isValid).toBe(false);
    });

    it('rechaza inyecciones de código o caracteres especiales', () => {
      const res = validateAndSanitizeTotpCode('<script>alert(1)</script>');
      expect(res.isValid).toBe(false);
      expect(res.value).toBe('1');
    });
  });

  describe('Paste Event Parsing & Normalization', () => {
    const parsePastePayload = (clipboardText) => {
      if (typeof clipboardText !== 'string') return '';
      return clipboardText.replace(/\D/g, '').slice(0, 6);
    };

    it('extrae 6 dígitos de formatos de autenticador comunes como "123 456" o "123-456"', () => {
      expect(parsePastePayload('492 108')).toBe('492108');
      expect(parsePastePayload('492-108')).toBe('492108');
      expect(parsePastePayload('Code: 852963')).toBe('852963');
      expect(parsePastePayload('\n\t 998877 \n')).toBe('998877');
    });

    it('devuelve cadena vacía si no hay dígitos', () => {
      expect(parsePastePayload('abcdef')).toBe('');
      expect(parsePastePayload('!@#$%^')).toBe('');
    });
  });

  describe('Rate Limiting & Anti-Brute-Force Policy', () => {
    const MAX_FAILED_ATTEMPTS = 5;
    const COOLDOWN_SECONDS = 30;

    const computeNextState = (currentAttempts) => {
      const next = currentAttempts + 1;
      const isLocked = next >= MAX_FAILED_ATTEMPTS;
      return {
        nextAttempts: next,
        cooldownRemaining: isLocked ? COOLDOWN_SECONDS : 0,
        isLocked
      };
    };

    it('permite reintentos hasta el límite de 5 intentos fallidos', () => {
      expect(computeNextState(1).isLocked).toBe(false);
      expect(computeNextState(3).isLocked).toBe(false);
      expect(computeNextState(4).isLocked).toBe(true);
      expect(computeNextState(4).cooldownRemaining).toBe(30);
    });
  });

  describe('Error Sanitization for MFA', () => {
    it('traduce errores de TOTP inválido a mensajes seguros sin filtrar detalles internos', () => {
      const safeMsg = getSafeAuthErrorMessage({ message: 'Invalid TOTP code provided' });
      expect(safeMsg).toContain('Código de autenticación incorrecto');
      expect(safeMsg).not.toContain('Invalid TOTP code provided');
    });

    it('detecta y mitiga errores de rate limit de Supabase Auth', () => {
      const safeMsg = getSafeAuthErrorMessage({ message: 'over_request_rate_limit: too many requests' });
      expect(safeMsg).toContain('Demasiados intentos fallidos');
    });

    it('maneja errores de expiración de sesión y token de forma amigable', () => {
      const safeMsg = getSafeAuthErrorMessage({ message: 'jwt token has expired' });
      expect(safeMsg).toContain('expirado');
    });
  });

  describe('Geometry calculations for Orbital OTP layout', () => {
    it('distribuye 6 nodos en ángulos de 60 grados', () => {
      const radius = 48;
      const angles = [0, 1, 2, 3, 4, 5].map(i => (i * 60 - 90) * (Math.PI / 180));
      
      const positions = angles.map(rad => ({
        x: Math.round(radius * Math.cos(rad)),
        y: Math.round(radius * Math.sin(rad))
      }));

      // El primer nodo (i=0, -90°) debe estar en (0, -48)
      expect(positions[0]).toEqual({ x: 0, y: -48 });
      // El nodo opuesto (i=3, 90°) debe estar en (0, 48)
      expect(positions[3]).toEqual({ x: 0, y: 48 });
      // Todos los nodos deben estar exactamente a distancia 'radius' del centro (0,0)
      positions.forEach(pos => {
        const dist = Math.hypot(pos.x, pos.y);
        expect(Math.abs(dist - radius)).toBeLessThanOrEqual(1);
      });
    });
  });
});
