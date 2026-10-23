import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabaseClient';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogIn,
  UserPlus,
  Sparkles,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
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

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSignup = mode === 'signup';

  // Validación reactiva de contraseña en tiempo real con 4 criterios
  const passwordConditions = {
    hasMinLength: password.length >= 8,
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password)
  };

  const conditionsCount = (
    (passwordConditions.hasMinLength ? 1 : 0) +
    (passwordConditions.hasUpperAndLower ? 1 : 0) +
    (passwordConditions.hasNumber ? 1 : 0) +
    (passwordConditions.hasSpecial ? 1 : 0)
  );

  const isAllPasswordConditionsMet = conditionsCount === 4;

  // Cálculo de fuerza para la barra dinámica
  let strengthLabel = 'Sin contraseña';
  let strengthPercent = 0;
  let strengthColor = 'rgba(255, 255, 255, 0.2)';
  let strengthGlow = 'none';

  if (password.length > 0) {
    if (conditionsCount <= 2) {
      strengthLabel = 'Débil';
      strengthPercent = Math.max(25, conditionsCount * 25);
      strengthColor = '#ff4d4d'; // Cyber red
      strengthGlow = '0 0 10px rgba(255, 77, 77, 0.4)';
    } else if (conditionsCount === 3) {
      strengthLabel = 'Media';
      strengthPercent = 65;
      strengthColor = '#f59e0b'; // Cyber amber
      strengthGlow = '0 0 10px rgba(245, 158, 11, 0.4)';
    } else if (conditionsCount === 4) {
      strengthLabel = 'Muy Fuerte';
      strengthPercent = 100;
      strengthColor = 'var(--accent-primary, #00f3ff)'; // Cian Neón
      strengthGlow = '0 0 14px rgba(0, 243, 255, 0.7)';
    }
  }

  // Lista de requerimientos reactivos para el checklist
  const requirementsList = [
    { id: 'min8', label: 'Mínimo 8 caracteres', met: passwordConditions.hasMinLength },
    { id: 'case', label: 'Mayúsculas y minúsculas', met: passwordConditions.hasUpperAndLower },
    { id: 'num', label: 'Al menos 1 número', met: passwordConditions.hasNumber },
    { id: 'spec', label: 'Al menos 1 símbolo especial', met: passwordConditions.hasSpecial }
  ];

  // Determinar si el botón principal de submit debe estar deshabilitado
  const isSubmitDisabled = isSignup
    ? (isLoading || isGoogleLoading || !fullName.trim() || !email.trim() || !isAllPasswordConditionsMet)
    : (isLoading || isGoogleLoading || !email.trim() || !password);

  // Capturar y mostrar explícitamente cualquier error de OAuth (URL hash, query o context)
  useEffect(() => {
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

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const checkAndRouteMFA = async (user) => {
    try {
      const hasMFA = await checkMFAStatus(user.id);
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
    if (isSubmitDisabled) return;

    setErrorMsg('');
    setSuccessMsg('');

    // Validación estricta de formato y sanitización de correo electrónico
    const emailValidation = validateAndSanitizeEmail(email);
    if (!emailValidation.isValid) {
      setErrorMsg(emailValidation.error);
      return;
    }
    const cleanEmail = emailValidation.value;

    // Validación según modo
    if (isSignup) {
      const displayNameValidation = validateAndSanitizeDisplayName(fullName);
      if (!displayNameValidation.isValid) {
        setErrorMsg(displayNameValidation.error);
        return;
      }

      if (!isAllPasswordConditionsMet) {
        setErrorMsg('Por favor cumple todos los requisitos de seguridad en la contraseña.');
        return;
      }

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
      if (isSignup) {
        const displayNameValidation = validateAndSanitizeDisplayName(fullName);
        const safeDisplayName = displayNameValidation.isValid ? displayNameValidation.value : 'Estudiante';

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: safeDisplayName,
              display_name: safeDisplayName
            }
          }
        });

        if (error) throw error;

        if (data?.user) {
          setSuccessMsg('¡Cuenta creada exitosamente! Revisa tu correo para confirmar o inicia sesión.');
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
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
            id: data.user.id
          });

          await checkAndRouteMFA(data.user);
        }
      }
    } catch (err) {
      safeDevLog('warn', 'Fallo en autenticación', { message: err?.message });
      const rawMessage = (err?.message || '').toLowerCase();
      if (rawMessage.includes('database error saving new user') || rawMessage.includes('error saving new user')) {
        setErrorMsg('Hubo un inconveniente en el servidor al registrar tu cuenta. Por favor verifica tus datos o inténtalo nuevamente.');
      } else {
        setErrorMsg(getSafeAuthErrorMessage(err, 'No se pudo completar la autenticación. Verifica tus datos.'));
      }
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

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #080b11)',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      {/* Background Orbs con transiciones suaves Cyber Luxe */}
      <div style={{
        position: 'absolute', top: '10%', left: '8%', width: '340px', height: '340px',
        background: isSignup ? '#bc13fe' : 'var(--accent-primary, #00f3ff)',
        filter: 'blur(160px)', opacity: isSignup ? 0.22 : 0.16,
        borderRadius: '50%', zIndex: 0,
        pointerEvents: 'none',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '8%', width: '400px', height: '400px',
        background: isSignup ? '#ff007f' : 'var(--accent-secondary, #bc13fe)',
        filter: 'blur(160px)', opacity: isSignup ? 0.20 : 0.12,
        borderRadius: '50%', zIndex: 0,
        pointerEvents: 'none',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }} />

      {/* Overlay spinner glassmórfico de seguridad durante redirección OAuth */}
      {isGoogleLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(8, 11, 17, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <div style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'var(--accent-primary, #00f3ff)',
              borderBottomColor: 'rgba(0, 243, 255, 0.3)',
              animation: 'spin 1.2s linear infinite',
              boxShadow: '0 0 20px rgba(0, 243, 255, 0.5)'
            }} />
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'var(--accent-primary, #00f3ff)',
              boxShadow: '0 0 16px var(--accent-primary, #00f3ff)'
            }} />
          </div>
          <div className="font-display" style={{
            color: 'var(--accent-primary, #00f3ff)',
            fontSize: '0.95rem',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}>
            Conectando con Google...
          </div>
        </div>
      )}

      {/* Tarjeta de Autenticación Cyber Luxe */}
      <div 
        className="login-card-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          padding: '32px 28px',
          background: isSignup 
            ? 'linear-gradient(150deg, rgba(20, 16, 34, 0.96) 0%, rgba(12, 14, 24, 0.97) 100%)' 
            : 'var(--bg-glass, rgba(13, 17, 28, 0.95))',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: isSignup 
            ? '1px solid rgba(188, 19, 254, 0.45)' 
            : '1px solid var(--border-glass-top, rgba(0, 243, 255, 0.22))',
          borderRadius: '26px',
          boxShadow: isSignup 
            ? '0 0 50px rgba(188, 19, 254, 0.22), var(--shadow-glass, 0 32px 64px rgba(0,0,0,0.6)), inset 0 1px 0 rgba(255, 255, 255, 0.12)' 
            : '0 0 40px rgba(0, 243, 255, 0.14), var(--shadow-glass, 0 32px 64px rgba(0,0,0,0.6)), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          zIndex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
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
          boxShadow: isSignup ? '0 0 16px #bc13fe' : '0 0 14px var(--accent-primary, #00f3ff)',
          transition: 'all 0.4s ease'
        }} />

        {/* 1. SELECTOR DE PESTAÑAS SUPERIOR TIPO CYBER LUXE */}
        <div 
          role="tablist"
          aria-label="Modo de autenticación"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            padding: '4px',
            background: 'rgba(7, 10, 19, 0.70)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            marginBottom: '22px',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)'
          }}
        >
          {/* Pill deslizante interactivo con animación suave */}
          <div style={{
            position: 'absolute',
            top: '4px',
            bottom: '4px',
            width: 'calc(50% - 4px)',
            left: isSignup ? 'calc(50%)' : '4px',
            background: isSignup
              ? 'linear-gradient(135deg, rgba(188, 19, 254, 0.30) 0%, rgba(255, 0, 128, 0.22) 100%)'
              : 'linear-gradient(135deg, rgba(0, 243, 255, 0.22) 0%, rgba(0, 160, 255, 0.16) 100%)',
            border: isSignup
              ? '1px solid rgba(188, 19, 254, 0.65)'
              : '1px solid rgba(0, 243, 255, 0.65)',
            boxShadow: isSignup
              ? '0 0 18px rgba(188, 19, 254, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 0 18px rgba(0, 243, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* Tab: Iniciar Sesión */}
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            onClick={() => switchMode('login')}
            disabled={isLoading || isGoogleLoading}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              color: !isSignup ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
              fontSize: '0.84rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              borderRadius: '12px',
              cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              transition: 'color 0.25s ease',
              textShadow: !isSignup ? '0 0 12px rgba(0, 243, 255, 0.6)' : 'none'
            }}
          >
            <LogIn size={15} color={!isSignup ? 'var(--accent-primary, #00f3ff)' : 'currentColor'} />
            <span>Iniciar Sesión</span>
          </button>

          {/* Tab: Crear Cuenta Académica */}
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            onClick={() => switchMode('signup')}
            disabled={isLoading || isGoogleLoading}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              color: isSignup ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
              fontSize: '0.84rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              borderRadius: '12px',
              cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              transition: 'color 0.25s ease',
              textShadow: isSignup ? '0 0 12px rgba(188, 19, 254, 0.6)' : 'none'
            }}
          >
            <Sparkles size={15} color={isSignup ? '#e879f9' : 'currentColor'} />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Encabezado de Identidad Visual */}
        <div style={{
          width: '54px', height: '54px',
          background: isSignup 
            ? 'linear-gradient(135deg, #bc13fe 0%, #ff007f 100%)' 
            : 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, var(--accent-secondary, #bc13fe) 100%)',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          boxShadow: isSignup ? '0 8px 24px rgba(188, 19, 254, 0.45)' : '0 8px 20px rgba(0, 243, 255, 0.35)',
          transition: 'all 0.4s ease'
        }}>
          {isSignup ? <UserPlus size={26} color="white" /> : <GraduationCap size={28} color="white" />}
        </div>

        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
          CampusFlow
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.88rem', lineHeight: 1.4 }}>
          {isSignup ? 'Crea tu cuenta académica para potenciar tu semestre' : t.enterDetails}
        </p>

        {/* Banner de Errores Legible y Amigable */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              background: 'rgba(255, 59, 48, 0.12)',
              border: '1px solid rgba(255, 68, 68, 0.45)',
              color: '#ff6b6b',
              padding: '12px 14px',
              borderRadius: '14px',
              marginBottom: '18px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'left',
              boxShadow: '0 0 20px rgba(255, 68, 68, 0.18)',
              lineHeight: 1.45
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

        {/* Banner de Éxito */}
        {successMsg && (
          <div
            role="status"
            style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#4ade80',
              padding: '12px 14px',
              borderRadius: '14px',
              marginBottom: '18px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'left',
              lineHeight: 1.4
            }}
          >
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2. FORMULARIO DE ACCESO Y CREACIÓN DE CUENTA ACADÉMICA */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Campo Nombre Completo (Solo en modo Crear Cuenta) */}
          {isSignup && (
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </div>
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignup}
                autoComplete="name"
                maxLength={60}
                disabled={isLoading || isGoogleLoading}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 48px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(188, 19, 254, 0.35)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.94rem',
                  outline: 'none',
                  opacity: (isLoading || isGoogleLoading) ? 0.7 : 1,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              />
            </div>
          )}

          {/* Campo Correo Electrónico */}
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Mail size={18} />
            </div>
            <input
              type="email"
              placeholder={isSignup ? "Correo académico o personal" : "Tu correo electrónico"}
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
                width: '100%',
                padding: '13px 16px 13px 48px',
                background: 'rgba(0,0,0,0.25)',
                border: isSignup ? '1px solid rgba(188, 19, 254, 0.35)' : '1px solid var(--border-glass-top)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.94rem',
                outline: 'none',
                opacity: (isLoading || isGoogleLoading) ? 0.7 : 1,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            />
          </div>

          {/* Campo Contraseña con Toggle Mostrar/Ocultar */}
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignup ? "Crea una contraseña segura" : t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              maxLength={72}
              disabled={isLoading || isGoogleLoading}
              style={{
                width: '100%',
                padding: '13px 46px 13px 48px',
                background: 'rgba(0,0,0,0.25)',
                border: isSignup ? '1px solid rgba(188, 19, 254, 0.35)' : '1px solid var(--border-glass-top)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.94rem',
                outline: 'none',
                opacity: (isLoading || isGoogleLoading) ? 0.7 : 1,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading || isGoogleLoading}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* VALIDADOR INTERACTIVO EN TIEMPO REAL (Solo en Crear Cuenta) */}
          {isSignup && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.30)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '14px',
              textAlign: 'left'
            }}>
              {/* Barra de fortaleza dinámica */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Fortaleza:
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: strengthColor,
                  textShadow: strengthGlow
                }}>
                  {strengthLabel}
                </span>
              </div>

              {/* Riel y barra de progreso animada */}
              <div style={{
                width: '100%',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${strengthPercent}%`,
                  background: strengthColor,
                  boxShadow: strengthGlow,
                  borderRadius: '999px',
                  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>

              {/* Checklist reactivo de 4 condiciones con acento cian neón */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {requirementsList.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: req.met ? 'var(--accent-primary, #00f3ff)' : 'rgba(255, 255, 255, 0.42)',
                      transition: 'color 0.25s ease'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: req.met ? 'rgba(0, 243, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                      border: req.met ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.18)',
                      boxShadow: req.met ? '0 0 8px rgba(0, 243, 255, 0.4)' : 'none',
                      transition: 'all 0.25s ease',
                      flexShrink: 0
                    }}>
                      {req.met ? (
                        <Check size={10} color="#00f3ff" strokeWidth={3.5} />
                      ) : (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.35)' }} />
                      )}
                    </div>
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón de Envío Principal */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              marginTop: '4px',
              padding: '13px',
              background: isSignup 
                ? (isSubmitDisabled 
                    ? 'rgba(188, 19, 254, 0.25)' 
                    : 'linear-gradient(135deg, #bc13fe 0%, #ff007f 100%)')
                : (isSubmitDisabled 
                    ? 'rgba(0, 243, 255, 0.25)' 
                    : 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, rgba(0, 243, 255, 0.85) 100%)'),
              border: isSubmitDisabled 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : (isSignup ? '1px solid rgba(188, 19, 254, 0.5)' : '1px solid rgba(0, 243, 255, 0.5)'),
              borderRadius: '12px',
              color: isSignup ? '#ffffff' : (isSubmitDisabled ? 'rgba(255, 255, 255, 0.5)' : '#080b11'),
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isSubmitDisabled ? 0.55 : 1,
              transition: 'all 0.3s ease',
              boxShadow: isSubmitDisabled 
                ? 'none' 
                : (isSignup ? '0 4px 20px rgba(188, 19, 254, 0.4)' : '0 4px 18px rgba(0, 243, 255, 0.35)')
            }}
          >
            {isLoading && !isGoogleLoading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span>{isSignup ? 'Crear Cuenta Académica' : t.login}</span>
                {isSignup ? <Sparkles size={17} /> : <ArrowRight size={17} />}
              </>
            )}
          </button>
        </form>

        {/* Separador Cyber */}
        <div style={{ margin: '20px 0 16px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
          <span>O CONTINÚA CON</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
        </div>

        {/* 3. BOTONES DE GOOGLE Y GITHUB (Limpios y funcionales en ambos modos) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            aria-label="Continuar con Google"
            className="btn-google-oauth glass-panel click-press"
            style={{
              width: '100%',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: isGoogleLoading 
                ? 'rgba(0, 243, 255, 0.12)' 
                : 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
              border: isGoogleLoading 
                ? '1px solid var(--accent-primary, #00f3ff)' 
                : '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
              borderRadius: '13px',
              color: 'var(--text-primary, #f5f5f7)',
              fontSize: '0.92rem',
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
                size={19} 
                color="var(--accent-primary, #00f3ff)" 
                style={{ 
                  animation: 'spin 1s linear infinite',
                  flexShrink: 0 
                }} 
              />
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
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
            aria-label="Continuar con GitHub"
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
              borderRadius: '13px',
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
      </div>
    </div>
  );
};

export default Login;
