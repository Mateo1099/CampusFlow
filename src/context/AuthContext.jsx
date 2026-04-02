import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState('aal1'); // Authentication Assurance Level - default aal1
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
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

  const checkMFAStatus = async (userId) => {
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
      
      // 🔒 SEGUNDO: Verificar tabla user_security para MFA requerido
      const { data, error } = await supabase
        .from('user_security')
        .select('mfa_enabled, mfa_status')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn(`[AUTH] Error en consulta user_security:`, error.code, error.message);
        // Si hay error (tabla no existe, sin datos, etc), asumir que MFA no está requerido
        console.log('[AUTH] Asumiendo mfaRequired = false por error en consulta');
        setMfaRequired(false);
        return false;
      }

      if (!data) {
        console.log('[AUTH] Sin datos de seguridad, asumiendo mfaRequired = false');
        setMfaRequired(false);
        return false;
      }

      // Determinar si MFA está realmente activo
      const hasMFA = data?.mfa_enabled === true && data?.mfa_status === 'PROTEGIDA';
      console.log(`[AUTH] MFA status para user ${userId}:`, { 
        mfa_enabled: data?.mfa_enabled, 
        mfa_status: data?.mfa_status, 
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
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAal('aal1');
    setMfaRequired(false);
  };

  const refreshSession = async () => {
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
  };

  const refreshSessionAfterMFA = async () => {
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
  };

  const value = {
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
  };

  // DEBUG: Log estado justo antes de retornar
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
