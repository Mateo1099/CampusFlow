import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(E2E_MOCK_AUTH_ENABLED ? E2E_MOCK_USER : null);
  const [loading, setLoading] = useState(!E2E_MOCK_AUTH_ENABLED);
  const [aal, setAal] = useState('aal1'); // Authentication Assurance Level - default aal1
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    if (E2E_MOCK_AUTH_ENABLED) return undefined;

    let isMounted = true; // Prevenir memory leaks si el componente se desmonta

    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Iniciando autenticación...');
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('[AUTH] Error obteniendo sesión:', sessionError);
          if (isMounted) {
            setUser(null);
            setAal('aal1'); // Default a aal1
            setMfaRequired(false);
            setSessionId(null);
          }
        } else if (session?.user) {
          console.log('[AUTH] Sesión encontrada para:', session.user.email, 'AAL:', session.user.aal);
          if (isMounted) {
            setUser(session.user);
            // Si AAL es undefined, asignar 'aal1' por defecto
            setAal(session.user.aal || 'aal1');
            setSessionId(session.access_token);
          }
          
          // ⚠️ NO ESPERAR a checkMFAStatus - hacerlo en background
          // Esto permite que setLoading(false) se ejecute inmediatamente
          checkMFAStatus(session.user.id);
        } else {
          console.log('[AUTH] Sin sesión activa');
          if (isMounted) {
            setUser(null);
            setAal('aal1'); // Default a aal1
            setMfaRequired(false);
            setSessionId(null);
          }
        }
      } catch (err) {
        console.error('[AUTH] Error en initializeAuth:', err);
        if (isMounted) {
          setUser(null);
          setAal('aal1'); // Default a aal1
          setMfaRequired(false);
        }
      } finally {
        // 🔥 CRÍTICO: setLoading SIEMPRE se ejecuta INMEDIATAMENTE
        if (isMounted) {
          console.log('[AUTH] ✅ setLoading(false) - Inicialización completada');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to auth changes - validar MFA de forma asíncrona
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH] onAuthStateChange:', _event, '- User:', session?.user?.email);
      
      if (session?.user) {
        if (isMounted) {
          setUser(session.user);
          // Si AAL es undefined, asignar 'aal1' por defecto
          setAal(session.user.aal || 'aal1');
          setSessionId(session.access_token);
        }
        
        // Validar MFA de forma asíncrona (en background, no bloquea)
        if (session.user.id) {
          checkMFAStatus(session.user.id);
        }
      } else {
        if (isMounted) {
          setUser(null);
          setAal('aal1'); // Default a aal1
          setMfaRequired(false);
          setSessionId(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkMFAStatus = useCallback(async (userId) => {
    try {
      console.log(`[AUTH] Verificando MFA status para user ${userId}...`);

      // 🔑 PRIMERO: Obtener el AAL actual de Supabase
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!aalError && aalData?.currentLevel) {
        console.log(`[AUTH] AAL actual de Supabase: ${aalData.currentLevel}`);
        setAal(aalData.currentLevel);
      } else if (aalError) {
        console.warn('[AUTH] Error obteniendo AAL de Supabase:', aalError);
      }

      // 🔒 SEGUNDO: Verificar factores MFA reales en Supabase Auth
      let hasVerifiedTotp = false;
      try {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (!factorsError && factorsData) {
          const totpFactors = factorsData.totp || [];
          hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          console.log(`[AUTH] Factores MFA reales: ${totpFactors.length} TOTP, ${hasVerifiedTotp ? 'al menos 1 verificado' : 'ninguno verificado'}`);
        } else if (factorsError) {
          console.warn('[AUTH] Error listando factores MFA:', factorsError.message);
        }
      } catch (factorsErr) {
        console.warn('[AUTH] Exception listando factores MFA:', factorsErr.message);
      }

      // TERCERO: Verificar tabla user_security como fuente secundaria
      const { data, error } = await supabase
        .from('user_security')
        .select('mfa_enabled, mfa_status')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn(`[AUTH] Error en consulta user_security:`, error.code, error.message);
        // Si hay error en user_security, usar factores reales como fuente de verdad
        const mfaFromFactors = hasVerifiedTotp;
        console.log(`[AUTH] Usando factores reales como fuente: mfaRequired = ${mfaFromFactors}`);
        setMfaRequired(mfaFromFactors);
        return mfaFromFactors;
      }

      if (!data) {
        console.log('[AUTH] Sin datos de security, verificando factores reales');
        // Sin registro en user_security, usar factores reales
        setMfaRequired(hasVerifiedTotp);
        return hasVerifiedTotp;
      }

      // Determinar si MFA está realmente activo - combinar ambas fuentes
      const mfaFromDB = data?.mfa_enabled === true && data?.mfa_status === 'PROTEGIDA';
      const hasMFA = hasVerifiedTotp || mfaFromDB;

      console.log(`[AUTH] MFA status para user ${userId}:`, {
        mfa_enabled_db: data?.mfa_enabled,
        mfa_status_db: data?.mfa_status,
        hasVerifiedTotp,
        resolved: hasMFA,
        currentLevel: aalData?.currentLevel
      });
      setMfaRequired(hasMFA);
      return hasMFA;
    } catch (err) {
      // IMPORTANTE: Capturar TODOS los errores y no lanzarlos
      console.error('[AUTH] Exception en checkMFAStatus:', err);
      console.log('[AUTH] Asumiendo mfaRequired = false por excepción');
      setMfaRequired(false);
      return false;
    }
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAal('aal1');
    setMfaRequired(false);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      console.log('[AUTH] Refrescando sesión...');
      
      // Obtener la sesión actualizada del servidor
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AUTH] Error al refrescar sesión:', sessionError);
        return false;
      }
      
      if (!session?.user) {
        console.warn('[AUTH] No hay sesión después de refrescar');
        return false;
      }
      
      // Actualizar los estados con los valores más recientes
      const newAal = session.user.aal || 'aal1';
      console.log('[AUTH] Sesión refrescada - AAL anterior:', aal, '-> AAL nuevo:', newAal);
      
      setUser(session.user);
      setAal(newAal);
      setSessionId(session.access_token);
      
      // Verificar el estado de MFA con la información más reciente
      if (session.user.id) {
        await checkMFAStatus(session.user.id);
      }
      
      return true;
    } catch (err) {
      console.error('[AUTH] Exception al refrescar sesión:', err);
      return false;
    }
  }, [aal, checkMFAStatus]);

  const refreshSessionAfterMFA = useCallback(async () => {
    try {
      // Obtener la sesión actualizada después de MFA
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user) {
        // Actualizar el estado con los nuevos valores
        setUser(session.user);
        setAal(session.user.aal); // Esto debería ser 'aal2' después de MFA
        setSessionId(session.access_token);
        
        // Pequeño retraso para asegurar que el sistema reconozca AAL2
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error refreshing session after MFA:', err);
      throw err;
    }
  }, []);

  // Memoizado: sin esto, el Provider crea un objeto `value` nuevo en cada render
  // (y AuthContext cambia de estado a menudo: loading, user, aal, mfaRequired),
  // forzando a re-renderizar TODOS los componentes que usan useAuth() en toda la
  // app (Sidebar, rutas protegidas, Dashboard, etc.) aunque no les afecte el cambio.
  const value = useMemo(() => ({
    user,
    loading,
    aal, // AAL1 = apenas autenticado, AAL2 = con MFA
    mfaRequired,
    sessionId,
    login,
    logout,
    refreshSession, // ← Función para refrescar la sesión
    refreshSessionAfterMFA,
    isAuthenticated: !!user,
    needsMFAChallenge: aal === 'aal1' && mfaRequired, // True si necesita pasar MFA
    checkMFAStatus
  }), [user, loading, aal, mfaRequired, sessionId, login, logout, refreshSession, refreshSessionAfterMFA, checkMFAStatus]);

  // DEBUG: solo en desarrollo, para no generar overhead ni ruido en producción.
  if (import.meta.env.DEV) {
    console.log(
      `[AUTH-DEBUG] ${loading ? '⏳ LOADING' : '✅ READY'}`,
      { 
        loading, 
        'user?': !!user,
        'user.email': user?.email,
        aal, 
        mfaRequired,
        'isAuthenticated': !!user,
        'needsMFAChallenge': aal === 'aal1' && mfaRequired
      }
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
