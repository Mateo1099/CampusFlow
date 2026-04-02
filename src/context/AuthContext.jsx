import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState(null); // Authentication Assurance Level
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setAal(session.user.aal);
          setSessionId(session.access_token);
          
          // Check MFA con timeout de 3 segundos
          try {
            await Promise.race([
              checkMFAStatus(session.user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('MFA check timeout')), 3000)
              )
            ]);
          } catch (mfaError) {
            console.warn('MFA check timeout/failed, allowing AAL1 access:', mfaError.message);
            setMfaRequired(false); // Fallback: asumir que no hay MFA requerido
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setUser(null);
        setAal(null);
        setMfaRequired(false);
      } finally {
        setLoading(false); // CRÍTICO: Siempre finalizar loading
      }
    };

    initializeAuth();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          setUser(session.user);
          setAal(session.user.aal);
          setSessionId(session.access_token);
          
          // Check if user has MFA enabled con timeout
          try {
            await Promise.race([
              checkMFAStatus(session.user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('MFA check timeout')), 3000)
              )
            ]);
          } catch (mfaError) {
            console.warn('MFA check timeout/failed, allowing AAL1 access:', mfaError.message);
            setMfaRequired(false);
          }
        } else {
          setUser(null);
          setAal(null);
          setMfaRequired(false);
          setSessionId(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setUser(null);
        setAal(null);
        setMfaRequired(false);
      } finally {
        setLoading(false); // CRÍTICO: Siempre finalizar loading
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMFAStatus = async (userId) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MFA status check timeout')), 2500)
      );

      const queryPromise = supabase
        .from('user_security')
        .select('mfa_enabled, mfa_status')
        .eq('user_id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking MFA status:', error);
        setMfaRequired(false); // Fallback: asumir sin MFA si hay error
        return;
      }

      // Determinar si MFA está realmente activo
      const hasMFA = data?.mfa_enabled === true && data?.mfa_status === 'PROTEGIDA';
      setMfaRequired(hasMFA);
    } catch (err) {
      console.warn('Error in checkMFAStatus (fallback to AAL1):', err.message);
      setMfaRequired(false); // CRÍTICO: Fallback seguro a AAL1
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAal(null);
    setMfaRequired(false);
  };

  const value = {
    user,
    loading,
    aal, // AAL1 = apenas autenticado, AAL2 = con MFA
    mfaRequired,
    sessionId,
    login,
    logout,
    isAuthenticated: !!user,
    needsMFAChallenge: aal === 'aal1' && mfaRequired, // True si necesita pasar MFA
    checkMFAStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
