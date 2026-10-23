import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabaseClient';
import { User, Lock, ArrowRight, Zap, GraduationCap, AlertCircle, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import {
  validateAndSanitizeEmail,
  validatePassword,
  validateAndSanitizeDisplayName,
  getSafeAuthErrorMessage,
  performGoogleOAuthSignIn,
  extractOAuthErrorFromUrl,
  safeDevLog
} from '../lib/authSecurity';
import { trackEvent } from '../services/analyticsService';

const Login = () => {
  const { login, checkMFAStatus, authError, clearAuthError } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  // Capturar y mostrar explícitamente cualquier error de OAuth (URL hash, query o context)
  React.useEffect(() => {
    const urlError = extractOAuthErrorFromUrl();
    const storedError = typeof window !== 'undefined' ? sessionStorage.getItem('campusflow_auth_error') : null;
    const effectiveError = urlError?.message || storedError || authError;

    if (effectiveError) {
      safeDevLog('warn', '[Login] Mostrando error capturado de OAuth en UI:', { effectiveError });
      setErrorMsg(effectiveError);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('campusflow_auth_error');
        if (window.location.hash.includes('error=') || window.location.search.includes('error=')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, [authError]);

  const checkAndRouteMFA = async (user) => {
    try {
      const hasMFA = await checkMFAStatus(user.id);
      
      // Si está en AAL1 y tiene MFA activo, redirigir a verificación TOTP
      if (user.aal === 'aal1' && hasMFA) {
        navigate('/mfa-challenge');
      } else {
        navigate('/');
      }
    } catch (routeErr) {
      safeDevLog('warn', 'Error determinando ruta MFA', { message: routeErr?.message });
      navigate('/');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLoading || isGoogleLoading) return; // Prevención de doble envío / condición de carrera

    setErrorMsg('');
    setSuccessMsg('');

    // Validación estricta de formato y sanitización de correo electrónico
    const emailValidation = validateAndSanitizeEmail(email);
    if (!emailValidation.isValid) {
      setErrorMsg(emailValidation.error);
      return;
    }
    const cleanEmail = emailValidation.value;

    // Validación de contraseña según OWASP
    if (mode === 'signup') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setErrorMsg(passwordValidation.error);
        return;
      }
    } else {
      if (!password || password.length === 0) {
        setErrorMsg('Por favor ingresa tu contraseña.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const rawDisplayName = cleanEmail.split('@')[0];
        const displayNameValidation = validateAndSanitizeDisplayName(rawDisplayName);
        const safeDisplayName = displayNameValidation.isValid ? displayNameValidation.value : 'Estudiante';

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { display_name: safeDisplayName }
          }
        });

        if (error) throw error;

        if (data?.user) {
          setSuccessMsg('¡Cuenta creada exitosamente! Revisa tu bandeja de entrada para confirmar tu correo o inicia sesión.');
          setMode('login');
          setPassword('');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) throw error;

        if (data?.user) {
          trackEvent('login_success', { method: 'email' });
          login({
            name: data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
            id: data.user.id
          });

          await checkAndRouteMFA(data.user);
        }
      }
    } catch (err) {
      safeDevLog('warn', 'Fallo en autenticación', { message: err?.message });
      setErrorMsg(getSafeAuthErrorMessage(err, 'No se pudo completar la autenticación. Verifica tus datos.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading || isGoogleLoading) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);
    setIsLoading(true);

    try {
      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
      const redirectUrl = `${origin}/`;

      safeDevLog('info', '[Login] Iniciando autenticación OAuth con Google...', { redirectUrl });

      const { data, error } = await performGoogleOAuthSignIn(supabase, {
        origin,
        redirectTo: redirectUrl
      });

      if (error) throw error;
      trackEvent('login_success', { method: 'google_oauth' });
      return data;
    } catch (err) {
      safeDevLog('warn', 'Error en Google OAuth login', { message: err?.message });
      setErrorMsg(getSafeAuthErrorMessage(err, 'Error al conectar con Google. Por favor intenta más tarde.'));
      setIsGoogleLoading(false);
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    if (provider === 'google') {
      return handleGoogleLogin();
    }

    if (isLoading || isGoogleLoading) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/?provider=${provider}`
        }
      });
      if (error) throw error;
    } catch (err) {
      safeDevLog('warn', `Error en social login con ${provider}`, { message: err?.message });
      setErrorMsg(getSafeAuthErrorMessage(err, `Error al conectar con ${provider}. Intenta más tarde.`));
      setIsLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Orbs reactivos al modo Login/Registro */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%', width: '320px', height: '320px',
        background: isSignup ? '#bc13fe' : 'var(--accent-primary)',
        filter: 'blur(150px)', opacity: isSignup ? 0.22 : 0.15,
        borderRadius: '50%', zIndex: 0,
        transition: 'all 0.6s ease'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%', width: '420px', height: '420px',
        background: isSignup ? '#ff007f' : 'var(--accent-secondary)',
        filter: 'blur(150px)', opacity: isSignup ? 0.18 : 0.10,
        borderRadius: '50%', zIndex: 0,
        transition: 'all 0.6s ease'
      }} />

      {/* Tarjeta de Autenticación con Diferenciación Visual Cyber Luxe */}
      <div 
        className="login-card-container"
        style={{
          position: 'relative',
          width: '100%', maxWidth: '420px', padding: '36px 36px 30px',
          background: isSignup 
            ? 'linear-gradient(145deg, rgba(22, 16, 36, 0.95) 0%, rgba(13, 15, 24, 0.96) 100%)' 
            : 'var(--bg-glass, rgba(15, 17, 26, 0.94))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isSignup 
            ? '1px solid rgba(188, 19, 254, 0.50)' 
            : '1px solid var(--border-glass-top, rgba(0, 243, 255, 0.25))',
          borderRadius: '24px',
          boxShadow: isSignup 
            ? '0 0 50px rgba(188, 19, 254, 0.25), var(--shadow-glass, 0 32px 64px rgba(0,0,0,0.6)), inset 0 1px 0 rgba(255, 255, 255, 0.12)' 
            : '0 0 35px rgba(0, 243, 255, 0.12), var(--shadow-glass, 0 32px 64px rgba(0,0,0,0.6)), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          zIndex: 1, textAlign: 'center',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Barra superior de acento neón según modo */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: isSignup 
            ? 'linear-gradient(90deg, #bc13fe 0%, #ff007f 50%, #bc13fe 100%)' 
            : 'linear-gradient(90deg, var(--accent-primary, #00f3ff) 0%, var(--accent-secondary, #bc13fe) 100%)',
          boxShadow: isSignup ? '0 0 14px #bc13fe' : '0 0 12px var(--accent-primary, #00f3ff)',
          transition: 'all 0.4s ease'
        }} />

        {/* Badge distintivo del modo actual */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '16px',
          background: isSignup ? 'rgba(188, 19, 254, 0.16)' : 'rgba(0, 243, 255, 0.10)',
          border: isSignup ? '1px solid rgba(188, 19, 254, 0.38)' : '1px solid rgba(0, 243, 255, 0.25)',
          color: isSignup ? '#e879f9' : 'var(--accent-primary, #00f3ff)',
          transition: 'all 0.3s ease'
        }}>
          {isSignup ? <UserPlus size={13} /> : <GraduationCap size={13} />}
          <span>{isSignup ? 'MODO: NUEVA CUENTA ACADÉMICA' : 'MODO: INICIO DE SESIÓN'}</span>
        </div>

        {/* Icono central de graduación / nuevo usuario con gradiente adaptativo */}
        <div style={{
          width: '58px', height: '58px',
          background: isSignup 
            ? 'linear-gradient(135deg, #bc13fe 0%, #ff007f 100%)' 
            : 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, var(--accent-secondary, #bc13fe) 100%)',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: isSignup ? '0 8px 24px rgba(188, 19, 254, 0.45)' : '0 8px 18px rgba(0, 243, 255, 0.3)',
          transition: 'all 0.4s ease'
        }}>
          {isSignup ? <UserPlus size={28} color="white" /> : <GraduationCap size={30} color="white" />}
        </div>

        <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 950, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
          CampusFlow
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.90rem' }}>
          {isSignup ? 'Crea tu cuenta académica para gestionar tu semestre' : t.enterDetails}
        </p>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: 'rgba(255, 59, 48, 0.12)',
              border: '1px solid rgba(255, 68, 68, 0.45)',
              color: '#ff6b6b',
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'left',
              boxShadow: '0 0 20px rgba(255, 68, 68, 0.18)',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, color: '#ff4d4d' }} />
            <span style={{ flex: 1, wordBreak: 'break-word' }}>{errorMsg}</span>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                if (clearAuthError) clearAuthError();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                padding: '2px',
                lineHeight: 1
              }}
              aria-label="Cerrar alerta"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            style={{
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#4ade80', padding: '12px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left'
            }}
          >
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <User size={18} />
            </div>
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              maxLength={254}
              disabled={isLoading || isGoogleLoading}
              style={{
                width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.2)',
                border: isSignup ? '1px solid rgba(188, 19, 254, 0.3)' : '1px solid var(--border-glass-top)',
                borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                opacity: (isLoading || isGoogleLoading) ? 0.7 : 1,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Lock size={18} />
            </div>
            <input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              maxLength={72}
              disabled={isLoading || isGoogleLoading}
              style={{
                width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.2)',
                border: isSignup ? '1px solid rgba(188, 19, 254, 0.3)' : '1px solid var(--border-glass-top)',
                borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                opacity: (isLoading || isGoogleLoading) ? 0.7 : 1,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            style={{
              marginTop: '6px', padding: '14px',
              background: isSignup 
                ? 'linear-gradient(135deg, #bc13fe 0%, #ff007f 100%)' 
                : 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, rgba(0, 243, 255, 0.85) 100%)',
              border: 'none', borderRadius: '12px',
              color: isSignup ? '#ffffff' : '#080b11',
              fontSize: '1rem', fontWeight: 800,
              cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: (isLoading || isGoogleLoading) ? 0.7 : 1,
              transition: 'all 0.3s ease',
              boxShadow: isSignup ? '0 4px 18px rgba(188, 19, 254, 0.35)' : '0 4px 16px rgba(0, 243, 255, 0.3)'
            }}
          >
            {isLoading && !isGoogleLoading ? 'Procesando...' : <>{isSignup ? 'Crear mi Cuenta' : t.login} <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ margin: '22px 0 18px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
          <span>O CONTINÚA CON</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
        </div>

        {/* Social Login: Continuar con Google & GitHub */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            aria-label="Iniciar sesión con Google"
            className="btn-google-oauth glass-panel click-press"
            style={{
              width: '100%',
              padding: '13px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: isGoogleLoading 
                ? 'rgba(0, 243, 255, 0.10)' 
                : 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
              border: isGoogleLoading 
                ? '1px solid var(--accent-primary, #00f3ff)' 
                : '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
              borderRadius: '14px',
              color: 'var(--text-primary, #f5f5f7)',
              fontSize: '0.94rem',
              fontWeight: 700,
              cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast, 0.2s ease)',
              opacity: (isLoading && !isGoogleLoading) ? 0.6 : 1,
              boxShadow: isGoogleLoading 
                ? '0 0 20px rgba(0, 243, 255, 0.3)' 
                : 'var(--shadow-glass, 0 4px 16px rgba(0, 0, 0, 0.12))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)'
            }}
          >
            {isGoogleLoading ? (
              <Loader2 
                size={20} 
                color="var(--accent-primary, #00f3ff)" 
                style={{ 
                  animation: 'spin 1s linear infinite',
                  flexShrink: 0 
                }} 
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.84h2.64c1.55-1.42 2.43-3.5 2.43-5.27z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.64-2.84c-.73.49-1.66.78-2.64.78-2.85 0-5.27-1.92-6.13-4.51H2.18v3.01C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.87 13.77c-.22-.65-.35-1.35-.35-2.07s.13-1.42.35-2.07V6.62H2.18C1.43 8.09 1 9.74 1 11.25s.43 3.16 1.18 4.63l3.69-3.01z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.69 3.01c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335" />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading || isGoogleLoading}
            aria-label="Iniciar sesión con GitHub"
            className="glass-panel click-press"
            style={{
              width: '100%',
              padding: '11px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.08))',
              borderRadius: '14px',
              color: 'var(--text-secondary, #a1a1aa)',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast, 0.2s ease)',
              opacity: (isLoading || isGoogleLoading) ? 0.6 : 1
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.082.824-.26.824-.578 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.151-1.305.276-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>Continuar con GitHub</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? 'login' : 'signup');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          disabled={isLoading || isGoogleLoading}
          style={{
            width: '100%', padding: '12px', background: 'transparent',
            border: 'none',
            color: isSignup ? '#d946ef' : 'var(--accent-primary)',
            fontSize: '0.9rem',
            fontWeight: 700, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'color 0.3s ease'
          }}
        >
          <Zap size={16} />
          {isSignup ? '¿Ya tienes cuenta? Inicia sesión' : 'Crear una cuenta académica'}
        </button>
      </div>
    </div>
  );
};

export default Login;

