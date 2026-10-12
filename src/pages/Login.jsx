import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabaseClient';
import { User, Lock, ArrowRight, Zap, GraduationCap, AlertCircle, CheckCircle } from 'lucide-react';
import {
  validateAndSanitizeEmail,
  validatePassword,
  validateAndSanitizeDisplayName,
  getSafeAuthErrorMessage,
  performGoogleOAuthSignIn,
  safeDevLog
} from '../lib/authSecurity';
import { trackEvent } from '../services/analyticsService';

const Login = () => {
  const { login, checkMFAStatus } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

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
    if (isLoading) return; // Prevención de doble envío / condición de carrera

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
    if (isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');
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
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    if (provider === 'google') {
      return handleGoogleLogin();
    }

    if (isLoading) return;

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

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'var(--accent-primary)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'var(--accent-secondary)', filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%', zIndex: 0 }} />

      <div style={{
        width: '100%', maxWidth: '420px', padding: '40px',
        background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass-top)', borderRadius: '24px',
        boxShadow: 'var(--shadow-glass)', zIndex: 1, textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(0, 243, 255, 0.3)'
        }}>
          <GraduationCap size={32} color="white" />
        </div>

        <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          CampusFlow
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          {mode === 'signup' ? 'Crea tu nueva cuenta académica' : t.enterDetails}
        </p>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.25)',
              color: '#ff4500', padding: '12px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
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
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass-top)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                opacity: isLoading ? 0.7 : 1
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
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              maxLength={72}
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass-top)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                opacity: isLoading ? 0.7 : 1
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px', padding: '14px',
              background: 'var(--accent-primary)', border: 'none', borderRadius: '12px',
              color: 'white', fontSize: '1rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: isLoading ? 0.7 : 1, transition: 'all 0.3s'
            }}
          >
            {isLoading ? 'Procesando...' : <>{mode === 'signup' ? 'Registrarme' : t.login} <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
          <span>O CONTINÚA CON</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
        </div>

        {/* Social Login: Continuar con Google & GitHub */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            aria-label="Iniciar sesión con Google"
            className="btn-google-oauth glass-panel click-press"
            style={{
              width: '100%',
              padding: '13px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
              borderRadius: '14px',
              color: 'var(--text-primary, #f5f5f7)',
              fontSize: '0.94rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast, 0.2s ease)',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: 'var(--shadow-glass, 0 4px 16px rgba(0, 0, 0, 0.12))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.84h2.64c1.55-1.42 2.43-3.5 2.43-5.27z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.64-2.84c-.73.49-1.66.78-2.64.78-2.85 0-5.27-1.92-6.13-4.51H2.18v3.01C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.87 13.77c-.22-.65-.35-1.35-.35-2.07s.13-1.42.35-2.07V6.62H2.18C1.43 8.09 1 9.74 1 11.25s.43 3.16 1.18 4.63l3.69-3.01z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.69 3.01c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335" />
            </svg>
            <span>{isLoading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast, 0.2s ease)',
              opacity: isLoading ? 0.6 : 1
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
            setMode(mode === 'login' ? 'signup' : 'login');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          disabled={isLoading}
          style={{
            width: '100%', padding: '12px', background: 'transparent',
            border: 'none', color: 'var(--accent-primary)', fontSize: '0.9rem',
            fontWeight: 600, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <Zap size={16} />
          {mode === 'login' ? 'Crear una cuenta académica' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
};

export default Login;
