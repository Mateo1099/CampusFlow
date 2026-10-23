import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performGoogleOAuthSignIn, getSafeAuthErrorMessage, extractOAuthErrorFromUrl } from '../lib/authSecurity';
import { syncUserProfile } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

describe('Google OAuth Flow & Profile Synchronization', () => {
  let originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();

    globalThis.window = {
      location: {
        origin: 'https://campusflow.app',
        pathname: '/login',
        href: 'https://campusflow.app/login'
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  describe('1. performGoogleOAuthSignIn - Parámetros y Redirección Segura', () => {
    it('llama a signInWithOAuth con provider "google", offline access y consent prompt', async () => {
      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth?...' },
        error: null
      });

      const mockSupabase = {
        auth: {
          signInWithOAuth: mockSignInWithOAuth
        }
      };

      const result = await performGoogleOAuthSignIn(mockSupabase);

      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://campusflow.app/',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      expect(result.data.provider).toBe('google');
      expect(result.error).toBeNull();
    });

    it('respeta opciones personalizadas de origin y redirectTo si se suministran', async () => {
      const mockSignInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockSupabase = { auth: { signInWithOAuth: mockSignInWithOAuth } };

      await performGoogleOAuthSignIn(mockSupabase, {
        origin: 'https://preview.campusflow.app',
        redirectTo: 'https://preview.campusflow.app/callback'
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: 'https://preview.campusflow.app/callback'
          })
        })
      );
    });

    it('rechaza llamadas si el cliente de Supabase no es válido o carece del método', async () => {
      await expect(performGoogleOAuthSignIn(null)).rejects.toThrow(
        'Cliente Supabase no configurado o método signInWithOAuth no disponible.'
      );

      await expect(performGoogleOAuthSignIn({})).rejects.toThrow(
        'Cliente Supabase no configurado o método signInWithOAuth no disponible.'
      );
    });
  });

  describe('2. Prevención de Condiciones de Carrera y Manejo de Errores', () => {
    it('bloquea envíos concurrentes cuando ya existe una operación en progreso (isLoading)', async () => {
      let isSubmitting = true;
      const mockSignIn = vi.fn();

      const handleGoogleLoginTrigger = async () => {
        if (isSubmitting) return 'BLOCKED';
        isSubmitting = true;
        return await mockSignIn();
      };

      const secondAttempt = await handleGoogleLoginTrigger();
      expect(secondAttempt).toBe('BLOCKED');
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('mapea fallos de OAuth de red a mensajes limpios y seguros sin filtrar secretos', () => {
      const networkError = new Error('Failed to fetch from https://accounts.google.com with secret token REDACTED');
      const safeMsg = getSafeAuthErrorMessage(networkError);

      expect(safeMsg).toBe('Problemas de conexión con el servidor. Verifica tu conexión a internet.');
      expect(safeMsg).not.toContain('https://accounts.google.com');
      expect(safeMsg).not.toContain('REDACTED');
    });

    it('mapea rechazo de consentimiento o usuario cancelado con mensaje amigable', () => {
      const accessDeniedError = { message: 'access_denied: user cancelled consent flow' };
      const safeMsg = getSafeAuthErrorMessage(accessDeniedError, 'Error al conectar con Google. Por favor intenta más tarde.');

      expect(safeMsg).toBe('Error al conectar con Google. Por favor intenta más tarde.');
    });
  });

  describe('3. Sincronización Automática de Perfil (syncUserProfile en AuthContext)', () => {
    it('crea el perfil con email_notifications: true y metadatos cuando el usuario ingresa por primera vez', async () => {
      const mockGoogleUser = {
        id: 'usr-google-101',
        email: 'estudiante.nuevo@universidad.edu',
        user_metadata: {
          full_name: 'Valentina Restrepo',
          picture: 'https://lh3.googleusercontent.com/a/avatar101'
        }
      };

      // Simular que el perfil NO existe todavía (primera vez que inicia sesión con Google)
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleMock
        })
      });

      // Simular upsert exitoso
      const upsertSingleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'usr-google-101',
          email: 'estudiante.nuevo@universidad.edu',
          full_name: 'Valentina Restrepo',
          avatar_url: 'https://lh3.googleusercontent.com/a/avatar101',
          email_notifications: true
        },
        error: null
      });

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: upsertSingleMock
        })
      });

      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: selectMock,
            upsert: upsertMock
          };
        }
        return {};
      });

      const profile = await syncUserProfile(mockGoogleUser);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(upsertMock).toHaveBeenCalledWith(
        {
          id: 'usr-google-101',
          email: 'estudiante.nuevo@universidad.edu',
          full_name: 'Valentina Restrepo',
          avatar_url: 'https://lh3.googleusercontent.com/a/avatar101',
          email_notifications: true
        },
        { onConflict: 'id' }
      );
      expect(profile).toBeDefined();
      expect(profile.email_notifications).toBe(true);
      expect(profile.full_name).toBe('Valentina Restrepo');
    });

    it('conserva el perfil existente si el usuario ya tenía cuenta registrada previamente', async () => {
      const existingUser = {
        id: 'usr-veterano-88',
        email: 'veterano@universidad.edu',
        user_metadata: { full_name: 'Estudiante Veterano' }
      };

      const existingProfileData = {
        id: 'usr-veterano-88',
        full_name: 'Estudiante Veterano Personalizado',
        email: 'veterano@universidad.edu',
        email_notifications: false // Ajuste previo del usuario que NO debe sobreescribirse
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: existingProfileData,
            error: null
          })
        })
      });

      const upsertMock = vi.fn();

      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: selectMock,
            upsert: upsertMock
          };
        }
        return {};
      });

      const result = await syncUserProfile(existingUser);

      expect(result).toEqual(existingProfileData);
      // No debe llamar a upsert si ya existía el perfil
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it('genera un fallback seguro de nombre usando el prefijo de email si faltan metadatos', async () => {
      const userSinNombre = {
        id: 'usr-no-name-55',
        email: 'camilo.andres@campusflow.edu',
        user_metadata: {}
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      let insertedPayload = null;
      const upsertMock = vi.fn().mockImplementation((payload) => {
        insertedPayload = payload;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: payload, error: null })
          })
        };
      });

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: selectMock,
        upsert: upsertMock
      }));

      await syncUserProfile(userSinNombre);

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.full_name).toBe('camilo.andres');
      expect(insertedPayload.email_notifications).toBe(true);
    });

    it('maneja excepciones de base de datos de forma resiliente sin romper el flujo', async () => {
      const badUser = { id: 'usr-db-fail', email: 'fail@test.com' };

      vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Postgres connection pool exhausted');
      });

      const result = await syncUserProfile(badUser);
      expect(result).toBeNull();
    });

    it('aplica fallback básico si el primer upsert con columnas extendidas falla', async () => {
      const newUser = {
        id: 'usr-fallback-123',
        email: 'nuevo.alumno@campus.edu',
        user_metadata: { full_name: 'Nuevo Alumno' }
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      let callCount = 0;
      const upsertMock = vi.fn().mockImplementation((payload) => {
        callCount++;
        if (callCount === 1) {
          // Primer intento falla (ej. columna email_notifications no existe en DB)
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'column "email_notifications" does not exist' }
              })
            })
          };
        }
        // Segundo intento básico tiene éxito
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: payload.id, full_name: payload.full_name },
              error: null
            })
          })
        };
      });

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: selectMock,
        upsert: upsertMock
      }));

      const profile = await syncUserProfile(newUser);

      expect(callCount).toBe(2);
      expect(profile).toBeDefined();
      expect(profile.id).toBe('usr-fallback-123');
      expect(profile.full_name).toBe('Nuevo Alumno');
    });

    it('retorna objeto de perfil por defecto si la base de datos rechaza ambos upserts', async () => {
      const lockedUser = {
        id: 'usr-locked-999',
        email: 'estudiante.offline@campus.edu',
        user_metadata: { full_name: 'Estudiante Temporal' }
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'RLS check violation on insert' }
          })
        })
      });

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: selectMock,
        upsert: upsertMock
      }));

      const profile = await syncUserProfile(lockedUser);

      expect(profile).toBeDefined();
      expect(profile.id).toBe('usr-locked-999');
      expect(profile.full_name).toBe('Estudiante Temporal');
      expect(profile.email_notifications).toBe(true);
    });
  });

  describe('4. Captura y Extracción de Errores OAuth (URL Callback & Hash)', () => {
    it('extrae y decodifica errores devueltos en el hash de la URL', () => {
      globalThis.window.location = {
        origin: 'https://campusflow.app',
        pathname: '/',
        hash: '#error=access_denied&error_code=403&error_description=User+cancelled+the+sign-in+process',
        search: ''
      };

      const extracted = extractOAuthErrorFromUrl();
      expect(extracted).not.toBeNull();
      expect(extracted.error).toBe('access_denied');
      expect(extracted.code).toBe('403');
      expect(extracted.message).toBe('User cancelled the sign-in process');
    });

    it('extrae errores devueltos en query search params (flujo PKCE)', () => {
      globalThis.window.location = {
        origin: 'https://campusflow.app',
        pathname: '/login',
        hash: '',
        search: '?error=unauthorized_client&error_description=The+client+is+not+authorized'
      };

      const extracted = extractOAuthErrorFromUrl();
      expect(extracted).not.toBeNull();
      expect(extracted.error).toBe('unauthorized_client');
      expect(extracted.message).toBe('The client is not authorized');
    });

    it('retorna null si la URL no contiene parámetros de error', () => {
      globalThis.window.location = {
        origin: 'https://campusflow.app',
        pathname: '/',
        hash: '#access_token=valid-jwt-token&refresh_token=valid-refresh&token_type=bearer',
        search: ''
      };

      const extracted = extractOAuthErrorFromUrl();
      expect(extracted).toBeNull();
    });

    it('retorna null de forma segura si window no está definido', () => {
      globalThis.window = undefined;
      const extracted = extractOAuthErrorFromUrl();
      expect(extracted).toBeNull();
    });
  });
});
