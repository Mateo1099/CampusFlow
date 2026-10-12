import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import OrbitalOtpVerification from '../components/ui/OrbitalOtpVerification';
import {
  validateAndSanitizeTotpCode,
  getSafeAuthErrorMessage,
  safeDevLog
} from '../lib/authSecurity';

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

const MFAChallenge = () => {
  const { user, logout, aal, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Manejo del contador de enfriamiento (Rate limiting en cliente contra fuerza bruta)
  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    // Si no hay usuario, ir a login
    if (!user) {
      navigate('/login');
      return;
    }

    // Si ya pasó MFA (AAL2), ir a dashboard
    if (aal === 'aal2') {
      navigate('/');
      return;
    }

    // Verificar si existen factores TOTP verificados
    const checkFactors = async () => {
      try {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (!factorsError && factors) {
          const totpFactors = factors.totp || [];
          const hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          if (!hasVerifiedTotp) {
            safeDevLog('info', 'No verified TOTP factors, redirecting to home');
            navigate('/');
          }
        }
      } catch (err) {
        safeDevLog('warn', 'Error verificando factores en MFAChallenge', { message: err?.message });
      }
    };

    checkFactors();
  }, [user, aal, navigate]);

  const handleVerify = async (eOrCode) => {
    if (eOrCode && typeof eOrCode.preventDefault === 'function') {
      eOrCode.preventDefault();
    }
    if (loading || cooldownRemaining > 0) return;

    const rawCode = typeof eOrCode === 'string' ? eOrCode : code;

    // Validación estricta del código de 6 dígitos
    const codeValidation = validateAndSanitizeTotpCode(rawCode);
    if (!codeValidation.isValid) {
      setError(codeValidation.error || 'El código debe tener 6 dígitos numéricos.');
      return;
    }

    const cleanCode = codeValidation.value;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Obtener factor TOTP verificado
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactors = factors?.totp || [];
      const verifiedFactor = totpFactors.find(f => f.status === 'verified') || totpFactors[0];

      if (!verifiedFactor) {
        throw new Error('No se encontró ningún factor de autenticación configurado.');
      }

      // 2. Crear challenge MFA criptográfico
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id
      });
      if (challengeError) throw challengeError;

      // 3. Verificar código contra el challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code: cleanCode
      });
      if (verifyError) throw verifyError;

      // 4. Refrescar sesión para elevar la credencial a AAL2
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      await refreshSession();

      setSuccess('¡Verificación exitosa! Accediendo a tu espacio seguro...');
      setFailedAttempts(0);

      // Redirigir al inicio una vez consolidada la sesión segura con tiempo para la animación orbital
      setTimeout(() => {
        navigate('/');
      }, 750);
    } catch (err) {
      safeDevLog('warn', 'Fallo en verificación MFA', { message: err?.message });
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= MAX_FAILED_ATTEMPTS) {
        setCooldownRemaining(COOLDOWN_SECONDS);
        setError(`Demasiados intentos fallidos. Bloqueado temporalmente por ${COOLDOWN_SECONDS} segundos.`);
      } else {
        const safeMessage = getSafeAuthErrorMessage(err, 'Código de verificación incorrecto o expirado.');
        setError(`${safeMessage} (Intento ${nextFailures}/${MAX_FAILED_ATTEMPTS})`);
      }

      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = loading || cooldownRemaining > 0;

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 20% 50%, rgba(30, 41, 59, 0.8), #0f172a 50%), radial-gradient(circle at 80% 80%, rgba(15, 23, 42, 0.9), #0f172a)',
      position: 'relative', overflow: 'hidden', padding: '24px'
    }}>
      {/* Animated Background Orbs */}
      <div style={{ 
        position: 'absolute', top: '10%', left: '5%', width: '400px', height: '400px', 
        background: 'radial-gradient(circle, var(--orb1, rgba(0, 243, 255, 0.2)), transparent)', 
        filter: 'blur(80px)', borderRadius: '50%', zIndex: 0
      }} />
      <div style={{ 
        position: 'absolute', bottom: '5%', right: '10%', width: '350px', height: '350px', 
        background: 'radial-gradient(circle, var(--orb2, rgba(188, 19, 254, 0.15)), transparent)', 
        filter: 'blur(70px)', borderRadius: '50%', zIndex: 0
      }} />

      <div style={{
        width: '100%', maxWidth: '440px', padding: '40px 32px',
        background: 'var(--bg-panel, rgba(30, 41, 59, 0.4))',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--border-glass-top, rgba(148, 163, 184, 0.15))',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        zIndex: 1, textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff), var(--accent-secondary, #bc13fe))',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(0, 243, 255, 0.3), 0 0 20px rgba(0, 243, 255, 0.2)'
        }}>
          <Lock size={32} color="white" />
        </div>

        <h1 className="font-display" style={{ 
          fontSize: '1.9rem', fontWeight: 950, color: 'var(--text-primary, #f1f5f9)', margin: '0 0 12px',
          letterSpacing: '-0.02em'
        }}>
          Verificación de Seguridad
        </h1>
        <p style={{ 
          color: 'var(--text-secondary, #cbd5e1)', marginBottom: '28px', fontSize: '0.92rem', lineHeight: '1.5'
        }}>
          Ingresa el código numérico de 6 dígitos de tu app autenticadora para acceder a CampusFlow.
        </p>

        {cooldownRemaining > 0 && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-danger, #ef4444)',
              padding: '14px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left'
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>Demasiados intentos fallidos. Bloqueado temporalmente por {cooldownRemaining}s.</span>
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <OrbitalOtpVerification
            value={code}
            onChange={(newCode) => {
              setCode(newCode);
              if (error) setError('');
            }}
            onComplete={(fullCode) => {
              setCode(fullCode);
              handleVerify(fullCode);
            }}
            isVerifying={loading}
            isSuccess={Boolean(success)}
            errorMessage={error}
            disabled={isBlocked}
            autoFocus={true}
            onClearError={() => setError('')}
            ariaLabel="Código de verificación TOTP de 6 dígitos"
          />

          <button
            type="submit"
            disabled={isBlocked || code.length !== 6}
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff), var(--accent-secondary, #bc13fe))',
              border: 'none', borderRadius: '14px',
              color: 'white', fontSize: '0.95rem', fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: isBlocked || code.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: (isBlocked || code.length !== 6) ? 0.45 : 1,
              transition: 'all 0.3s ease',
              boxShadow: (isBlocked || code.length !== 6) ? 'none' : '0 4px 18px rgba(0, 243, 255, 0.25)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {loading ? 'Verificando...' : cooldownRemaining > 0 ? `Espera (${cooldownRemaining}s)` : <>Verificar Acceso <ArrowRight size={18} /></>}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          style={{
            width: '100%', margin: '16px 0 0', padding: '12px',
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary, #94a3b8)', fontSize: '0.88rem',
            cursor: 'pointer', transition: 'color 0.2s',
            fontWeight: 600
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary, #ffffff)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)'; }}
        >
          ← Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default MFAChallenge;
