import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lock, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrbitalOtpVerification from './OrbitalOtpVerification';
import {
  validateAndSanitizeTotpCode,
  getSafeAuthErrorMessage,
  safeDevLog
} from '../../lib/authSecurity';

const MFAVerificationModal = ({ isOpen, onClose, onVerificationSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Reset al abrir o cerrar el modal
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setSuccess('');
      setAttempt(0);
      setLoading(false);
    }
  }, [isOpen]);

  // Limpieza automática del error tras 6 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleVerify = useCallback(async (eOrCode) => {
    if (eOrCode && typeof eOrCode.preventDefault === 'function') {
      eOrCode.preventDefault();
    }
    if (loading || attempt >= 5) return;

    const rawCode = typeof eOrCode === 'string' ? eOrCode : code;
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
      // 1. Obtener factores MFA (TOTP)
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactors = factors?.totp || [];
      const verifiedFactor = totpFactors.find(f => f.status === 'verified') || totpFactors[0];

      if (!verifiedFactor) {
        throw new Error('No se encontró ningún factor de autenticación configurado.');
      }

      // 2. Crear challenge MFA
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
      await supabase.auth.refreshSession();

      setSuccess('¡Verificación exitosa! Accediendo...');
      setAttempt(0);

      // Esperar brevemente para permitir que la animación orbital de éxito se muestre
      setTimeout(() => {
        if (onVerificationSuccess) onVerificationSuccess();
      }, 700);

    } catch (err) {
      safeDevLog('warn', 'Error verificando código MFA en modal', { message: err?.message });
      const nextAttempt = attempt + 1;
      setAttempt(nextAttempt);

      if (nextAttempt >= 5) {
        setError('Demasiados intentos fallidos. Por seguridad, inténtalo más tarde.');
      } else {
        const safeMessage = getSafeAuthErrorMessage(err, 'Código de verificación incorrecto o expirado.');
        setError(`${safeMessage} (Intento ${nextAttempt}/5)`);
      }

      setCode('');
    } finally {
      setLoading(false);
    }
  }, [attempt, code, loading, onVerificationSuccess]);

  const isBlocked = loading || attempt >= 5;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '440px',
              padding: '36px 28px',
              background: 'var(--bg-panel, rgba(15, 23, 42, 0.9))',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
              borderRadius: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar opcional */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ventana de verificación"
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary, #ffffff)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)'; }}
              >
                <X size={20} />
              </button>
            )}

            {/* Header Icon */}
            <div style={{
              width: '58px',
              height: '58px',
              background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff), var(--accent-secondary, #bc13fe))',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 20px rgba(0, 243, 255, 0.25)'
            }}>
              <Lock size={28} color="#ffffff" />
            </div>

            <h2 className="font-display" style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: 'var(--text-primary, #ffffff)',
              margin: '0 0 8px',
              letterSpacing: '-0.02em'
            }}>
              Verificación de Seguridad
            </h2>
            <p style={{
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: '0.86rem',
              lineHeight: 1.5,
              margin: '0 0 24px'
            }}>
              Ingresa el código numérico de 6 dígitos generado por tu autenticador.
            </p>

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <OrbitalOtpVerification
                value={code}
                onChange={(val) => {
                  setCode(val);
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
                size="compact"
                onClearError={() => setError('')}
                ariaLabel="Código de 6 dígitos del autenticador"
              />

              <button
                type="submit"
                disabled={isBlocked || code.length !== 6}
                style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff), var(--accent-secondary, #bc13fe))',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: isBlocked || code.length !== 6 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (isBlocked || code.length !== 6) ? 0.45 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: (isBlocked || code.length !== 6) ? 'none' : '0 4px 18px rgba(0, 243, 255, 0.25)'
                }}
              >
                {loading ? 'Verificando...' : <>Verificar Código <ArrowRight size={17} /></>}
              </button>
            </form>

            {/* Footer ayuda */}
            <div style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.08))'
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--text-secondary, #94a3b8)',
                fontWeight: 500
              }}>
                ¿Necesitas ayuda? Abre tu aplicación autenticadora y copia el código actual.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MFAVerificationModal;
