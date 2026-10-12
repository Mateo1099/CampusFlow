import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, AlertCircle, ShieldCheck } from 'lucide-react';

/**
 * OrbitalOtpVerification - Componente de Verificación OTP con Animación Orbital
 * Inspirado en 'OTP Verification v3'
 *
 * Características:
 * - 6 casillas numéricas individuales con autofoco secuencial y pegado completo (paste event).
 * - Colapso suave hacia el centro en órbita circular giratoria fluida (validation spinner) al validar.
 * - Núcleo central pulsante con gradiente cian-magenta y nodos orbitales luminosos.
 * - Resolución a badge circular de éxito con pulso de confirmación o rebote elástico en caso de error.
 * - Totalmente integrado con el sistema de tokens CSS de CampusFlow (Cyber Luxe & Minimalist Tech).
 * - Cumplimiento WCAG 2.2: soporte para prefers-reduced-motion, roles ARIA y navegación por teclado.
 * - Control estricto de caché: maneja tokens y códigos exclusivamente en memoria volátil de React.
 */
const OrbitalOtpVerification = ({
  value = '',
  onChange,
  onComplete,
  isVerifying = false,
  isSuccess = false,
  errorMessage = '',
  disabled = false,
  autoFocus = true,
  onClearError,
  ariaLabel = 'Código de verificación de seguridad de 6 dígitos',
  size = 'normal' // 'normal' | 'compact'
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [internalDigits, setInternalDigits] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRefs = useRef([]);

  // Sincronizar estado interno si se pasa `value` como prop controlada
  useEffect(() => {
    if (typeof value === 'string') {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      const digitsArr = Array(6).fill('').map((_, i) => clean[i] || '');
      setInternalDigits(digitsArr);
    }
  }, [value]);

  // Al detectar nuevo error, sacudir las cajas y enfocar la primera
  useEffect(() => {
    if (errorMessage) {
      setShakeKey(prev => prev + 1);
      const timeout = setTimeout(() => {
        if (!disabled && !isVerifying && inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [errorMessage, disabled, isVerifying]);

  // Autofoco inicial
  useEffect(() => {
    if (autoFocus && !disabled && !isVerifying && !isSuccess) {
      const firstEmptyIndex = internalDigits.findIndex(d => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      if (inputRefs.current[targetIndex]) {
        inputRefs.current[targetIndex].focus();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCode = useMemo(() => internalDigits.join(''), [internalDigits]);

  const handleDigitChange = useCallback((index, rawVal) => {
    if (disabled || isVerifying || isSuccess) return;

    if (errorMessage && onClearError) {
      onClearError();
    }

    const numericOnly = rawVal.replace(/\D/g, '');
    const newDigit = numericOnly.slice(-1) || '';

    setInternalDigits(prev => {
      const next = [...prev];
      next[index] = newDigit;
      const fullCode = next.join('');
      if (onChange) onChange(fullCode);

      if (newDigit && index < 5) {
        requestAnimationFrame(() => {
          inputRefs.current[index + 1]?.focus();
        });
      }

      if (fullCode.length === 6 && onComplete) {
        // Disparar validación al completar el sexto dígito
        setTimeout(() => onComplete(fullCode), 120);
      }

      return next;
    });
  }, [disabled, isVerifying, isSuccess, errorMessage, onClearError, onChange, onComplete]);

  const handleKeyDown = useCallback((index, e) => {
    if (disabled || isVerifying || isSuccess) return;

    if (e.key === 'Backspace') {
      if (!internalDigits[index] && index > 0) {
        e.preventDefault();
        setInternalDigits(prev => {
          const next = [...prev];
          next[index - 1] = '';
          if (onChange) onChange(next.join(''));
          return next;
        });
        inputRefs.current[index - 1]?.focus();
      } else if (internalDigits[index]) {
        // Borrar casilla actual
        setInternalDigits(prev => {
          const next = [...prev];
          next[index] = '';
          if (onChange) onChange(next.join(''));
          return next;
        });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [disabled, isVerifying, isSuccess, internalDigits, onChange]);

  const handlePaste = useCallback((e) => {
    if (disabled || isVerifying || isSuccess) return;
    e.preventDefault();

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    if (errorMessage && onClearError) {
      onClearError();
    }

    const nextDigits = Array(6).fill('').map((_, i) => pastedData[i] || '');
    setInternalDigits(nextDigits);

    if (onChange) onChange(pastedData);

    const focusTarget = Math.min(pastedData.length, 5);
    inputRefs.current[focusTarget]?.focus();

    if (pastedData.length === 6 && onComplete) {
      setTimeout(() => onComplete(pastedData), 150);
    }
  }, [disabled, isVerifying, isSuccess, errorMessage, onClearError, onChange, onComplete]);

  // Dimensiones según el tamaño prop
  const isCompact = size === 'compact';
  const boxWidth = isCompact ? 42 : 48;
  const boxHeight = isCompact ? 50 : 58;
  const boxSpacing = isCompact ? 50 : 58;
  const orbitRadius = isCompact ? 40 : 48;

  // Cálculo de coordenadas (en reposo horizontal vs en órbita circular)
  const nodeLayouts = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((i) => {
      // Posición horizontal (lineal centrada en 0)
      const linearX = (i - 2.5) * boxSpacing;
      const linearY = 0;

      // Posición orbital: 6 puntos distribuidos equitativamente en 360 grados (60° c/u)
      const angleRad = (i * 60 - 90) * (Math.PI / 180);
      const orbitX = Math.round(orbitRadius * Math.cos(angleRad));
      const orbitY = Math.round(orbitRadius * Math.sin(angleRad));

      return { linearX, linearY, orbitX, orbitY, angleRad };
    });
  }, [boxSpacing, orbitRadius]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* ── ESCENARIO ORBITAL INTERACTIVO ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: `${boxHeight + 40}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Núcleo central pulsante (visible cuando está validando o al tener éxito) */}
        <AnimatePresence>
          {isVerifying && !shouldReduceMotion && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0.85, 1.25, 0.85],
                opacity: [0.5, 0.9, 0.5]
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                scale: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' },
                opacity: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }
              }}
              style={{
                position: 'absolute',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--accent-primary, #00f3ff) 0%, var(--accent-secondary, #bc13fe) 60%, transparent 80%)',
                filter: 'blur(4px)',
                zIndex: 2,
                pointerEvents: 'none'
              }}
            />
          )}
        </AnimatePresence>

        {/* Badge de Éxito al verificar */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 220 }}
              style={{
                position: 'absolute',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(0, 243, 255, 0.2) 100%)',
                border: '2px solid var(--accent-success, #34c759)',
                boxShadow: '0 0 35px rgba(34, 197, 94, 0.4), inset 0 0 15px rgba(0, 243, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
            >
              <Check size={32} color="var(--accent-success, #34c759)" strokeWidth={3} />
              
              {/* Anillo de onda expansiva */}
              {!shouldReduceMotion && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.9 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid var(--accent-primary, #00f3ff)',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anillo orbital rotatorio (Framer Motion) */}
        <motion.div
          key={`boxes-container-${shakeKey}`}
          animate={
            // Si hay error, sacudida en X
            errorMessage && !shouldReduceMotion
              ? { x: [-12, 12, -8, 8, -4, 4, 0] }
              : isVerifying && !shouldReduceMotion
              ? { rotate: 360 }
              : { rotate: 0, x: 0 }
          }
          transition={
            errorMessage && !shouldReduceMotion
              ? { duration: 0.4, ease: 'easeInOut' }
              : isVerifying && !shouldReduceMotion
              ? { repeat: Infinity, duration: 2.2, ease: 'linear' }
              : { duration: 0.3 }
          }
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {nodeLayouts.map((node, i) => {
            const hasDigit = Boolean(internalDigits[i]);
            const isFocused = focusedIndex === i;
            const hasError = Boolean(errorMessage);

            // Coordenadas dinámicas:
            // Si reduces motion, se atenúan sin colapso orbital
            let targetX = node.linearX;
            let targetY = node.linearY;
            let nodeWidth = boxWidth;
            let nodeHeight = boxHeight;
            let borderRadius = '14px';
            let opacity = 1;

            if (isSuccess) {
              // Colapsa al centro en éxito
              targetX = 0;
              targetY = 0;
              nodeWidth = 8;
              nodeHeight = 8;
              borderRadius = '50%';
              opacity = 0;
            } else if (isVerifying) {
              if (shouldReduceMotion) {
                targetX = node.linearX;
                targetY = 0;
                opacity = 0.4;
              } else {
                targetX = node.orbitX;
                targetY = node.orbitY;
                nodeWidth = 14;
                nodeHeight = 14;
                borderRadius = '50%';
                opacity = 1;
              }
            }

            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  x: targetX,
                  y: targetY,
                  width: `${nodeWidth}px`,
                  height: `${nodeHeight}px`,
                  borderRadius,
                  opacity
                }}
                transition={{
                  type: 'spring',
                  stiffness: isVerifying ? 260 : 380,
                  damping: isVerifying ? 22 : 28
                }}
                style={{
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isVerifying
                    ? 'radial-gradient(circle, var(--accent-primary, #00f3ff) 0%, var(--accent-secondary, #bc13fe) 100%)'
                    : hasError
                    ? 'rgba(239, 68, 68, 0.1)'
                    : hasDigit
                    ? 'var(--bg-glass-hover, rgba(255, 255, 255, 0.08))'
                    : 'var(--bg-glass, rgba(255, 255, 255, 0.05))',
                  backdropFilter: isVerifying ? 'none' : 'blur(12px)',
                  WebkitBackdropFilter: isVerifying ? 'none' : 'blur(12px)',
                  border: isVerifying
                    ? 'none'
                    : hasError
                    ? '1.5px solid var(--accent-danger, #ef4444)'
                    : isFocused
                    ? '2px solid var(--accent-primary, #00f3ff)'
                    : hasDigit
                    ? '1.5px solid rgba(0, 243, 255, 0.4)'
                    : '1.5px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
                  boxShadow: isVerifying
                    ? '0 0 16px var(--accent-primary, #00f3ff), 0 0 24px rgba(188, 19, 254, 0.5)'
                    : hasError
                    ? '0 0 15px rgba(239, 68, 68, 0.25)'
                    : isFocused
                    ? '0 0 20px rgba(0, 243, 255, 0.3), inset 0 0 10px rgba(0, 243, 255, 0.08)'
                    : hasDigit
                    ? '0 4px 15px rgba(0, 0, 0, 0.3)'
                    : '0 2px 10px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden',
                  cursor: disabled || isVerifying || isSuccess ? 'not-allowed' : 'text'
                }}
                onClick={() => {
                  if (!disabled && !isVerifying && !isSuccess) {
                    inputRefs.current[i]?.focus();
                  }
                }}
              >
                {/* Dígito e Input individual (oculto en modo orbital / éxito) */}
                {!isVerifying && !isSuccess && (
                  <>
                    <input
                      ref={el => (inputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={internalDigits[i]}
                      disabled={disabled || isVerifying || isSuccess}
                      aria-label={`Dígito ${i + 1} de 6`}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(-1)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        textAlign: 'center',
                        fontSize: isCompact ? '1.4rem' : '1.7rem',
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: hasError
                          ? 'var(--accent-danger, #ef4444)'
                          : 'var(--text-primary, #f5f5f7)',
                        caretColor: 'var(--accent-primary, #00f3ff)',
                        cursor: disabled ? 'not-allowed' : 'text',
                        padding: 0
                      }}
                    />

                    {/* Línea o punto indicador de presencia de dígito */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        width: hasDigit ? '18px' : '6px',
                        height: '2px',
                        borderRadius: '2px',
                        background: hasDigit
                          ? 'var(--accent-primary, #00f3ff)'
                          : 'rgba(255, 255, 255, 0.15)',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'none'
                      }}
                    />
                  </>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ── ESTADOS DE TEXTO ACCESIBLES Y FEEDBACK WCAG ── */}
      <div
        style={{
          minHeight: '28px',
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%'
        }}
      >
        <AnimatePresence mode="wait">
          {isVerifying ? (
            <motion.p
              key="verifying-status"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                margin: 0,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent-primary, #00f3ff)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.02em'
              }}
            >
              <ShieldCheck size={16} className={shouldReduceMotion ? '' : 'animate-pulse'} />
              <span>Verificando código de autenticación...</span>
            </motion.p>
          ) : isSuccess ? (
            <motion.p
              key="success-status"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--accent-success, #34c759)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} />
              <span>Código verificado correctamente</span>
            </motion.p>
          ) : errorMessage ? (
            <motion.div
              key="error-status"
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--accent-danger, #ef4444)',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </motion.div>
          ) : (
            <motion.p
              key="help-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                margin: 0,
                fontSize: '0.78rem',
                color: 'var(--text-secondary, #a1a1aa)',
                fontWeight: 500
              }}
            >
              {currentCode.length === 0
                ? 'Ingresa o pega tu código numérico'
                : `${currentCode.length} de 6 dígitos ingresados`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrbitalOtpVerification;
