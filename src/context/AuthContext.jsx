/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { safeDevLog } from '../lib/authSecurity';

const AuthContext = createContext();

// Solo Playwright activa este usuario ficticio al iniciar su servidor aislado.
// La variable no existe en desarrollo normal ni en producción.
const E2E_MOCK_AUTH_ENABLED = import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
const E2E_MOCK_USER = Object.freeze({
  id: '00000000-0000-4000-8000-000000000001',
  email: 'qa@campusflow.test',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'CampusFlow QA', has_completed_onboarding: true },
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z'
});

/**
 * Ensures a user profile exists in public.profiles.
 * If the user logs in for the first time via Google OAuth or email,
 * this function guarantees default fields: full_name, email, avatar_url,
 * and email_notifications: true.
 * @param {object} user - Supabase user object
 * @returns {Promise<object | null>} The synchronized profile or null
 */
export async function syncUserProfile(user) {
  if (!user || !user.id) return null;

  try {
    // 1. Verificar si el perfil ya existe
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, email_notifications, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      safeDevLog('warn', '[AuthContext] Error comprobando perfil existente:', { message: fetchError.message });
    }

    if (existingProfile && existingProfile.id) {
      return existingProfile;
    }

    // 2. Extraer metadatos seguros de Google OAuth o email
    const rawName = user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      (user.email ? user.email.split('@')[0] : 'Estudiante');

    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    const defaultProfile = {
      id: user.id,
      email: user.email || '',
      full_name: rawName,
      avatar_url: avatar,
      email_notifications: true
    };

    safeDevLog('info', '[AuthContext] Creando perfil inicial para nuevo usuario Google OAuth...', { userId: user.id });

    // Intento 1: upsert completo con todas las columnas estándar
    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('profiles')
        .upsert(defaultProfile, { onConflict: 'id' })
        .select()
        .single();

      if (!insertError && insertedData) {
        return insertedData;
      }

      if (insertError) {
        safeDevLog('warn', '[AuthContext] Error en upsert de perfil inicial:', { message: insertError.message });
      }
    } catch (upsertErr) {
      safeDevLog('warn', '[AuthContext] Excepción en upsert completo de perfil:', { message: upsertErr?.message });
    }

    // Intento 2: Fallback mínimo si la tabla en DB aún no tiene columnas adicionales (ej. email_notifications)
    try {
      const basicProfile = {
        id: user.id,
        full_name: rawName
      };
      const { data: basicData, error: basicError } = await supabase
        .from('profiles')
        .upsert(basicProfile, { onConflict: 'id' })
        .select()
        .single();

      if (!basicError && basicData) {
        return { ...defaultProfile, ...basicData };
      }
    } catch (basicErr) {
      safeDevLog('warn', '[AuthContext] Excepción en upsert básico de perfil:', { message: basicErr?.message });
    }

    // Fallback garantizado en memoria: nunca dejar al usuario sin perfil por defecto
    return defaultProfile;
  } catch (err) {
    safeDevLog('error', '[AuthContext] Excepción en syncUserProfile:', { message: err?.message });
    return null;
  }
}

/**
 * Recupera síncronamente el usuario de sesión guardado en localStorage.
 * Permite renderizado instantáneo en arranques en frío estilo Facebook,
 * eliminando redirecciones preventivas a /login.
 */
function getStoredUserFromLocalStorage() {
  if (E2E_MOCK_AUTH_ENABLED) return E2E_MOCK_USER;
  if (typeof window === 'undefined') return null;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed?.user) {
            return parsed.user;
          }
        }
      }
    }
  } catch {
    // Si localStorage está bloqueado o parse falla, continuar de forma segura
  }
  return null;
}

export function AuthProvider({ children }) {
  // Inicialización instantánea desde localStorage para sesión permanente estilo Facebook
  const [user, setUser] = useState(() => getStoredUserFromLocalStorage());
  const [loading, setLoading] = useState(() => {
    if (E2E_MOCK_AUTH_ENABLED) return false;
    const stored = getStoredUserFromLocalStorage();
    return stored ? false : true;
  });
  const [aal, setAal] = useState('aal1'); // Authentication Assurance Level - default aal1
  const [mfaRequired, setMfaRequired] = useState(false);

  const checkMFAStatus = useCallback(async (userId) => {
    if (!userId) return false;

    try {
      safeDevLog('info', `Verificando MFA status para user ${userId}...`);

      // 1. Obtener el AAL actual de Supabase
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!aalError && aalData?.currentLevel) {
        setAal(aalData.currentLevel);
      } else if (aalError) {
        safeDevLog('warn', 'Error obteniendo AAL de Supabase', { message: aalError.message });
      }

      // 2. Verificar factores MFA reales en Supabase Auth (fuente criptográfica)
      let hasVerifiedTotp = false;
      try {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (!factorsError && factorsData) {
          const totpFactors = factorsData.totp || [];
          hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          safeDevLog('info', 'Factores MFA listados', {
            totpCount: totpFactors.length,
            hasVerified: hasVerifiedTotp
          });
        } else if (factorsError) {
          safeDevLog('warn', 'Error listando factores MFA', { message: factorsError.message });
        }
      } catch (factorsErr) {
        safeDevLog('warn', 'Excepción listando factores MFA', { message: factorsErr.message });
      }

      // 3. Verificar tabla user_security con maybeSingle() para no lanzar PGRST116 en usuarios nuevos
      const { data, error } = await supabase
        .from('user_security')
        .select('mfa_enabled, mfa_status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        safeDevLog('warn', 'Error en consulta user_security', { code: error.code });
        setMfaRequired(hasVerifiedTotp);
        return hasVerifiedTotp;
      }

      if (!data) {
        setMfaRequired(hasVerifiedTotp);
        return hasVerifiedTotp;
      }

      // Determinar si MFA está realmente activo combinando las fuentes
      const mfaFromDB = data?.mfa_enabled === true && data?.mfa_status === 'PROTEGIDA';
      const hasMFA = hasVerifiedTotp || mfaFromDB;

      setMfaRequired(hasMFA);
      return hasMFA;
    } catch (err) {
      safeDevLog('error', 'Excepción en checkMFAStatus', { message: err?.message });
      setMfaRequired(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (E2E_MOCK_AUTH_ENABLED) return undefined;

    let isMounted = true; // Prevenir memory leaks y race conditions al desmontar

    // Detectar si la URL actual trae parámetros de retorno OAuth (Google / PKCE)
    const hasOAuthParams = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('refresh_token=') ||
      window.location.hash.includes('error=') ||
      window.location.search.includes('code=')
    );

    // Safety timeout de 4 segundos que fuerza descongelar la pantalla (loading = false)
    // si la red móvil, proveedor o navegador retrasan la respuesta
    const safetyTimeoutId = setTimeout(() => {
      if (isMounted) {
        safeDevLog('warn', '[AuthContext] Safety timeout de 4s alcanzado en initializeAuth; forzando setLoading(false)');
        setLoading(false);
      }
    }, 4000);

    const initializeAuth = async () => {
      try {
        safeDevLog('info', 'Iniciando verificación de sesión Supabase...', { hasOAuthParams });
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          safeDevLog('warn', 'Error obteniendo sesión inicial', { message: sessionError.message });
          if (isMounted) {
            setUser(null);
            setAal('aal1');
            setMfaRequired(false);
            setLoading(false);
          }
        } else if (session?.user) {
          safeDevLog('info', 'Sesión activa confirmada en getSession');
          if (isMounted) {
            // Descongelar de inmediato la interfaz de usuario
            setUser(session.user);
            setAal(session.user.aal || 'aal1');
            setLoading(false);
          }
          // Fire-and-forget: Sincronizar perfil inicial en background sin bloquear la UI
          syncUserProfile(session.user).catch((e) => {
            safeDevLog('warn', '[AuthContext] Error asíncrono en syncUserProfile inicial:', { message: e?.message });
          });
          // Fire-and-forget: Comprobar MFA en background sin bloquear la UI
          checkMFAStatus(session.user.id).catch((e) => {
            safeDevLog('warn', '[AuthContext] Error asíncrono en checkMFAStatus inicial:', { message: e?.message });
          });
        } else {
          // Si no hay sesión en storage pero hay parámetros OAuth en la URL,
          // esperar que onAuthStateChange reciba SIGNED_IN (o que el safety timeout de 4s desbloquee)
          if (hasOAuthParams) {
            safeDevLog('info', 'Retorno OAuth detectado en URL; esperando evento SIGNED_IN...');
          } else {
            safeDevLog('info', 'Sin sesión activa ni parámetros OAuth');
            if (isMounted) {
              setUser(null);
              setAal('aal1');
              setMfaRequired(false);
              setLoading(false);
            }
          }
        }
      } catch (err) {
        safeDevLog('error', 'Error en initializeAuth', { message: err?.message });
        if (isMounted) {
          setUser(null);
          setAal('aal1');
          setMfaRequired(false);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuchar eventos de cambio de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      safeDevLog('info', `onAuthStateChange: ${_event}`);
      
      clearTimeout(safetyTimeoutId);

      if (session?.user) {
        if (isMounted) {
          // Descongelar de inmediato la UI al confirmar session.user
          setUser(session.user);
          setAal(session.user.aal || 'aal1');
          setLoading(false);
        }

        // Limpiar de forma segura los fragmentos hash de OAuth para estética y seguridad
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // Fire-and-forget en segundo plano sin await ni bloqueos de UI
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED' || _event === 'INITIAL_SESSION') {
          syncUserProfile(session.user).catch((e) => {
            safeDevLog('warn', '[AuthContext] Error asíncrono en syncUserProfile listener:', { message: e?.message });
          });
        }
        if (session.user.id) {
          checkMFAStatus(session.user.id).catch((e) => {
            safeDevLog('warn', '[AuthContext] Error asíncrono en checkMFAStatus listener:', { message: e?.message });
          });
        }
      } else if (_event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setAal('aal1');
          setMfaRequired(false);
          setLoading(false);
        }
      } else if (!hasOAuthParams) {
        // Si no hay sesión y no estamos en medio de un redirect OAuth, marcar no autenticado
        if (isMounted) {
          setUser(null);
          setAal('aal1');
          setMfaRequired(false);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeoutId);
      subscription.unsubscribe();
    };
  }, [checkMFAStatus]);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      safeDevLog('warn', 'Excepción en supabase.auth.signOut', { message: err?.message });
    } finally {
      setUser(null);
      setAal('aal1');
      setMfaRequired(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      safeDevLog('info', 'Refrescando sesión con Supabase Auth...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        safeDevLog('error', 'Error al refrescar sesión', { message: sessionError.message });
        return false;
      }
      
      if (!session?.user) {
        safeDevLog('warn', 'No hay sesión activa tras refresco');
        return false;
      }
      
      const newAal = session.user.aal || 'aal1';
      setUser(session.user);
      setAal(newAal);
      
      if (session.user.id) {
        await checkMFAStatus(session.user.id);
      }
      
      return true;
    } catch (err) {
      safeDevLog('error', 'Excepción al refrescar sesión', { message: err?.message });
      return false;
    }
  }, [checkMFAStatus]);

  const refreshSessionAfterMFA = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        setUser(session.user);
        setAal(session.user.aal || 'aal2');
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
      return false;
    } catch (err) {
      safeDevLog('error', 'Error refreshing session after MFA', { message: err?.message });
      throw err;
    }
  }, []);

  // Memoizado para evitar re-renders innecesarios en la app.
  // Nota de seguridad: NO guardamos ni exponemos tokens de acceso JWT en el contexto
  // para mitigar exposición en DevTools y ataques de extracción de estado.
  const value = useMemo(() => ({
    user,
    loading,
    aal,
    mfaRequired,
    sessionId: null, // Propiedad mantenida para compatibilidad retroactiva sin filtrar tokens
    login,
    logout,
    refreshSession,
    refreshSessionAfterMFA,
    syncUserProfile,
    isAuthenticated: !!user,
    needsMFAChallenge: aal === 'aal1' && mfaRequired,
    checkMFAStatus
  }), [user, loading, aal, mfaRequired, login, logout, refreshSession, refreshSessionAfterMFA, checkMFAStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
