/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useCallback, useId } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  BookOpen, 
  Calendar, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  X, 
  Clock, 
  Flame, 
  Bell, 
  Lock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playClick, playPhaseCompleteChime } from '../../lib/audioService';

export const ONBOARDING_STORAGE_KEY = 'campusflow_has_completed_onboarding';

export function getOnboardingStorageKey(userId) {
  return userId ? `${ONBOARDING_STORAGE_KEY}_${userId}` : ONBOARDING_STORAGE_KEY;
}

export function hasCompletedOnboarding(user) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    if (user?.user_metadata?.has_completed_onboarding === true) return true;
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') return true;
    if (user?.id && window.localStorage.getItem(getOnboardingStorageKey(user.id)) === 'true') return true;
    return false;
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(user) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    if (user?.id) {
      window.localStorage.setItem(getOnboardingStorageKey(user.id), 'true');
    }
    window.dispatchEvent(new CustomEvent('campusflow:onboarding-completed', {
      detail: { userId: user?.id, timestamp: Date.now() }
    }));
  } catch (e) {
    console.warn('[Onboarding] Error guardando flag en localStorage:', e);
  }
}

export function resetOnboarding(user) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    if (user?.id) {
      window.localStorage.removeItem(getOnboardingStorageKey(user.id));
    }
  } catch (e) {
    console.warn('[Onboarding] Error reseteando flag en localStorage:', e);
  }
}

const ONBOARDING_STEPS = [
  {
    id: 'courses-deadlines',
    stepNumber: 1,
    tag: 'GESTIÓN ACADÉMICA',
    title: 'Gestión de Materias y Entregas',
    icon: BookOpen,
    accentColor: 'var(--accent-primary, #00f3ff)',
    description: 'Visualiza tus asignaturas con un semáforo de alertas inteligente. Las entregas críticas se priorizan en tiempo real para que mantengas tu calendario académico bajo control.',
    renderPreview: () => (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          marginTop: '16px'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '14px',
            background: 'rgba(255, 59, 48, 0.12)',
            border: '1px solid rgba(255, 59, 48, 0.35)',
            boxShadow: '0 0 16px rgba(255, 59, 48, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem' }}>🔴</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary, #fff)' }}>
                Entrega Final • Cálculo III
              </div>
              <div style={{ fontSize: '0.72rem', color: '#ff3b30', fontWeight: 600 }}>
                URGENTE • Menos de 24 horas restantes
              </div>
            </div>
          </div>
          <span 
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'rgba(255, 59, 48, 0.25)',
              color: '#ff6961',
              letterSpacing: '0.05em'
            }}
          >
            CRÍTICO
          </span>
        </div>

        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '14px',
            background: 'rgba(255, 149, 0, 0.10)',
            border: '1px solid rgba(255, 149, 0, 0.30)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem' }}>🟡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary, #fff)' }}>
                Taller Grupal • Física Mecánica
              </div>
              <div style={{ fontSize: '0.72rem', color: '#ff9500', fontWeight: 600 }}>
                PRÓXIMO • Vence en 2 días
              </div>
            </div>
          </div>
          <span 
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'rgba(255, 149, 0, 0.2)',
              color: '#ffb340',
              letterSpacing: '0.05em'
            }}
          >
            MODERADO
          </span>
        </div>

        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '14px',
            background: 'rgba(52, 199, 89, 0.10)',
            border: '1px solid rgba(52, 199, 89, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem' }}>🟢</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary, #fff)' }}>
                Lectura Semana 6 • Algoritmos
              </div>
              <div style={{ fontSize: '0.72rem', color: '#34c759', fontWeight: 600 }}>
                EN TIEMPO • Más de 5 días
              </div>
            </div>
          </div>
          <span 
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'rgba(52, 199, 89, 0.2)',
              color: '#34c759',
              letterSpacing: '0.05em'
            }}
          >
            ESTABLE
          </span>
        </div>
      </div>
    )
  },
  {
    id: 'planner-pomodoro',
    stepNumber: 2,
    tag: 'PRODUCTIVIDAD & RITMO',
    title: 'Planificador Semanal y Bloques de Estudio',
    icon: Calendar,
    accentColor: 'var(--accent-secondary, #bc13fe)',
    description: 'Estructura tu semana en bloques horarios interactivos y sincronízalos con el temporizador Pomodoro para maximizar tu concentración académica y acumular XP.',
    renderPreview: () => (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          marginTop: '16px'
        }}
      >
        <div 
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'var(--bg-glass, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(188, 19, 254, 0.18)',
                border: '1px solid rgba(188, 19, 254, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Clock size={18} color="var(--accent-secondary, #bc13fe)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary, #fff)' }}>
                09:00 - 11:00 • Bloque de Estudio
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                Estructuras de Datos • Sesión Focus
              </div>
            </div>
          </div>
          <span 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--accent-lime, #34c759)'
            }}
          >
            <Sparkles size={13} /> +35 XP
          </span>
        </div>

        <div 
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(188, 19, 254, 0.12) 0%, rgba(0, 243, 255, 0.08) 100%)',
            border: '1px solid rgba(188, 19, 254, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 149, 0, 0.15)',
                border: '1px solid rgba(255, 149, 0, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flame size={18} color="#ff9500" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary, #fff)' }}>
                Modo Focus Pomodoro
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                25 min Enfoque / 5 min Pausa activa
              </div>
            </div>
          </div>
          <span 
            style={{
              padding: '3px 8px',
              borderRadius: '8px',
              fontSize: '0.70rem',
              fontWeight: 700,
              background: 'rgba(0, 243, 255, 0.15)',
              color: 'var(--accent-primary, #00f3ff)'
            }}
          >
            Activo
          </span>
        </div>
      </div>
    )
  },
  {
    id: 'security-settings',
    stepNumber: 3,
    tag: 'BLINDAJE Y CONFIGURACIÓN',
    title: 'Ajustes de Seguridad y Notificaciones',
    icon: ShieldCheck,
    accentColor: 'var(--accent-lime, #34c759)',
    description: 'Protege tu cuenta con autenticación orbital en dos pasos (2FA / TOTP AAL2) y adapta la interfaz a tu preferencia con los modos Cyber Luxe y Minimalist Tech.',
    renderPreview: () => (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          marginTop: '16px'
        }}
      >
        <div 
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(52, 199, 89, 0.08)',
            border: '1px solid rgba(52, 199, 89, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(52, 199, 89, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Lock size={18} color="#34c759" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary, #fff)' }}>
              Autenticación 2FA Orbital (AAL2)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)' }}>
              Códigos TOTP temporales sin dependencias de SMS
            </div>
          </div>
          <CheckCircle2 size={18} color="#34c759" />
        </div>

        <div 
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'var(--bg-glass, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(0, 243, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={18} color="var(--accent-primary, #00f3ff)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary, #fff)' }}>
              Alertas Sonoras y Temas Dinámicos
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)' }}>
              Modo Cyber Luxe (Oscuro) & Minimalist Tech (Claro)
            </div>
          </div>
          <span 
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--accent-primary, #00f3ff)'
            }}
          >
            Configurable
          </span>
        </div>
      </div>
    )
  }
];

export default function OnboardingModal({
  isOpen: controlledIsOpen,
  onClose,
  forceShow = false
}) {
  const { user } = useAuth();
  const titleId = useId();
  const descId = useId();
  const shouldReduceMotion = useReducedMotion();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Determinar si el modal está abierto
  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Verificación inicial de usuario nuevo
  useEffect(() => {
    if (controlledIsOpen !== undefined) return;

    if (forceShow) {
      const timer = setTimeout(() => {
        setInternalIsOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const alreadyCompleted = hasCompletedOnboarding(user);
      if (!alreadyCompleted) {
        setInternalIsOpen(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [user, controlledIsOpen, forceShow]);

  // Listener para evento custom que permita reabrir el tour desde cualquier componente
  useEffect(() => {
    const handleOpenRequest = () => {
      setCurrentStep(0);
      setInternalIsOpen(true);
    };

    window.addEventListener('campusflow:open-onboarding', handleOpenRequest);
    return () => {
      window.removeEventListener('campusflow:open-onboarding', handleOpenRequest);
    };
  }, []);

  const handleNext = useCallback(() => {
    try {
      playClick(900);
    } catch {
      // Audio opcional
    }
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    try {
      playClick(700);
    } catch {
      // Audio opcional
    }
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleFinish = useCallback(() => {
    try {
      playPhaseCompleteChime();
    } catch {
      // Audio opcional
    }
    markOnboardingCompleted(user);
    setInternalIsOpen(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [user, onClose]);

  const handleSkip = useCallback(() => {
    try {
      playClick(600);
    } catch {
      // Audio opcional
    }
    markOnboardingCompleted(user);
    setInternalIsOpen(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [user, onClose]);

  // Manejo de teclado (Enter / Esc / Flechas)
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < ONBOARDING_STEPS.length - 1) {
          handleNext();
        } else {
          handleFinish();
        }
      } else if (e.key === 'ArrowRight' && currentStep < ONBOARDING_STEPS.length - 1) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, currentStep, handleNext, handlePrev, handleFinish, handleSkip]);

  const stepData = ONBOARDING_STEPS[currentStep] || ONBOARDING_STEPS[0];
  const StepIcon = stepData.icon;

  const animationVariants = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 },
    exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="onboarding-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
        >
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="onboarding-modal-card"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '540px',
              borderRadius: '24px',
              padding: '32px 28px',
              background: 'var(--bg-panel, rgba(15, 17, 26, 0.92))',
              border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
              boxShadow: 'var(--shadow-glass, 0 32px 64px rgba(0, 0, 0, 0.55)), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary, #f5f5f7)',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
              overflow: 'hidden'
            }}
          >
            {/* Botón de cierre rápido / omitir */}
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Omitir introducción"
              className="btn-onboarding-skip-cross"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary, #a1a1aa)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast, 0.2s ease)'
              }}
            >
              <X size={16} />
            </button>

            {/* Stepper Header */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {ONBOARDING_STEPS.map((s, idx) => {
                  const isActive = idx === currentStep;
                  const isPast = idx < currentStep;
                  return (
                    <div
                      key={s.id}
                      aria-current={isActive ? 'step' : undefined}
                      style={{
                        height: '6px',
                        width: isActive ? '32px' : '16px',
                        borderRadius: '999px',
                        background: isActive 
                          ? 'var(--accent-primary, #00f3ff)' 
                          : isPast 
                            ? 'rgba(0, 243, 255, 0.4)' 
                            : 'rgba(255, 255, 255, 0.15)',
                        boxShadow: isActive ? '0 0 10px var(--accent-primary, #00f3ff)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  );
                })}
              </div>

              <span 
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--text-muted, #71717a)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                Paso {currentStep + 1} de {ONBOARDING_STEPS.length}
              </span>
            </div>

            {/* Step Content con transiciones animadas */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepData.id}
                variants={animationVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: shouldReduceMotion ? 0.05 : 0.25 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'rgba(0, 243, 255, 0.12)',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 18px rgba(0, 243, 255, 0.15)'
                    }}
                  >
                    <StepIcon size={24} color={stepData.accentColor} />
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: 'var(--accent-primary, #00f3ff)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {stepData.tag}
                    </span>
                    <h2
                      id={titleId}
                      style={{
                        margin: 0,
                        fontSize: '1.24rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-display, Inter, sans-serif)',
                        color: 'var(--text-primary, #f5f5f7)',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {stepData.title}
                    </h2>
                  </div>
                </div>

                <p
                  id={descId}
                  style={{
                    fontSize: '0.90rem',
                    lineHeight: 1.55,
                    color: 'var(--text-secondary, #a1a1aa)',
                    margin: '0 0 14px'
                  }}
                >
                  {stepData.description}
                </p>

                {/* Vista previa representativa del paso */}
                {stepData.renderPreview()}
              </motion.div>
            </AnimatePresence>

            {/* Barra de acciones inferior */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-glass-side, rgba(255, 255, 255, 0.08))'
              }}
            >
              <div>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="btn-onboarding-skip"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #71717a)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'color var(--transition-fast, 0.2s ease)'
                  }}
                >
                  Omitir tour
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="btn-onboarding-prev"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
                      background: 'var(--bg-glass, rgba(255, 255, 255, 0.05))',
                      color: 'var(--text-primary, #f5f5f7)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={15} />
                    Anterior
                  </button>
                )}

                {currentStep < ONBOARDING_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-onboarding-next"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 22px',
                      borderRadius: '12px',
                      border: '1px solid transparent',
                      background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, rgba(0, 243, 255, 0.75) 100%)',
                      color: '#080b11',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(0, 243, 255, 0.3)'
                    }}
                  >
                    Siguiente
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="btn-onboarding-finish"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 24px',
                      borderRadius: '12px',
                      border: '1px solid transparent',
                      background: 'linear-gradient(135deg, var(--accent-lime, #34c759) 0%, var(--accent-primary, #00f3ff) 100%)',
                      color: '#080b11',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(52, 199, 89, 0.35)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    Comenzar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

OnboardingModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  forceShow: PropTypes.bool
};
