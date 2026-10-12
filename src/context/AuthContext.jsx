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
  user_metadata: { full_name: 'CampusFlow QA' },
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
      .select('id, full_name, email, email_notifications')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      safeDevLog('warn', '[AuthContext] Error comprobando perfil existente:', { message: fetchError.message });
    }

    if (!existingProfile) {
      // 2. Extraer metadatos seguros de Google OAuth
      const rawName = user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        (user.email ? user.email.split('@')[0] : 'Estudiante');

      const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      const newProfile = {
        id: user.id,
        email: user.email || '',
        full_name: rawName,
        avatar_url: avatar,
        email_notifications: true
      };

      safeDevLog('info', '[AuthContext] Creando perfil inicial para nuevo usuario Google OAuth...', { userId: user.id });

      const { data: insertedData, error: insertError } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        safeDevLog('warn', '[AuthContext] Error en upsert de perfil inicial:', { message: insertError.message });
        return null;
      }

      return insertedData || newProfile;
    }

    return existingProfile;
  } catch (err) {
    safeDevLog('error', '[AuthContext] Excepción en syncUserProfile:', { message: err?.message });
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(E2E_MOCK_AUTH_ENABLED ? E2E_MOCK_USER : null);
  const [loading, setLoading] = useState(!E2E_MOCK_AUTH_ENABLED);
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

      // 3. Verificar tabla user_security como fuente secundaria protegida por RLS
      const { data, error } = await supabase
        .from('user_security')
        .select('mfa_enabled, mfa_status')
        .eq('user_id', userId)
        .single();

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

    const initializeAuth = async () => {
      try {
        safeDevLog('info', 'Iniciando verificación de sesión Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          safeDevLog('warn', 'Error obteniendo sesión inicial', { message: sessionError.message });
          if (isMounted) {
            setUser(null);
            setAal('aal1');
            setMfaRequired(false);
          }
        } else if (session?.user) {
          safeDevLog('info', 'Sesión activa detectada');
          if (isMounted) {
            setUser(session.user);
            setAal(session.user.aal || 'aal1');
          }
          // Sincronizar perfil inicial en background para usuarios nuevos / Google OAuth
          syncUserProfile(session.user);
          // Comprobar MFA en background sin bloquear el flujo principal
          checkMFAStatus(session.user.id);
        } else {
          safeDevLog('info', 'Sin sesión activa');
          if (isMounted) {
            setUser(null);
            setAal('aal1');
            setMfaRequired(false);
          }
        }
      } catch (err) {
        safeDevLog('error', 'Error en initializeAuth', { message: err?.message });
        if (isMounted) {
          setUser(null);
          setAal('aal1');
          setMfaRequired(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuchar eventos de cambio de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      safeDevLog('info', `onAuthStateChange: ${_event}`);
      
      if (session?.user) {
        if (isMounted) {
          setUser(session.user);
          setAal(session.user.aal || 'aal1');
        }
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED' || _event === 'INITIAL_SESSION') {
          syncUserProfile(session.user);
        }
        if (session.user.id) {
          checkMFAStatus(session.user.id);
        }
      } else {
        if (isMounted) {
          setUser(null);
          setAal('aal1');
          setMfaRequired(false);
        }
      }
    });

    return () => {
      isMounted = false;
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
