import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * BinEatButton - Microinteracción "The Bin Eats The Label"
 * Inspirada en el efecto destructivo cinemático donde el bote de basura devora la etiqueta.
 *
 * Mecánica:
 * 1. Al hacer clic, la tapa del bote se abre hacia arriba (hinge rotation).
 * 2. El icono se desplaza hacia la derecha "tragándose" la etiqueta.
 * 3. El texto se consume progresivamente mediante un recorte visual sincronizado (clip-path).
 * 4. La tapa se cierra victoriosa de golpe (snap shut con spring físico) y emite un pulso visual.
 * 5. Se ejecuta el callback `onConfirm`.
 *
 * Variantes y Sistema Híbrido:
 * - Soporte para tamaños 'sm' y 'md'.
 * - Diseñado para Modo Oscuro (Cyber Luxe) y Modo Claro (Minimalist Tech) mediante CSS variables:
 *   var(--accent-danger), var(--bg-panel), var(--text-primary).
 *
 * Accesibilidad:
 * - `type="button"`, `aria-label` descriptivo, `aria-busy` durante la animación.
 * - Soporte prioritario para `prefers-reduced-motion`: ejecuta `onConfirm` de inmediato sin demoras.
 */
const BinEatButton = ({
  onConfirm,
  label = 'ELIMINAR',
  size = 'md',
  disabled = false,
  isLoading = false,
  className = '',
  style = {},
  ariaLabel
}) => {
  // Estados de animación: 'idle' | 'eating' | 'chomp' | 'done'
  const [animState, setAnimState] = useState('idle');
  const [travelDistance, setTravelDistance] = useState(0);

  const buttonRef = useRef(null);
  const labelRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = (e) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (disabled || isLoading || animState !== 'idle') return;

    // Accesibilidad: Fallback inmediato para usuarios con prefers-reduced-motion activo
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onConfirm?.();
      return;
    }

    // Medir la distancia que debe recorrer el icono en base al ancho de la etiqueta
    const labelWidth =
      labelRef.current?.offsetWidth ||
      (typeof label === 'string' ? label.length * (size === 'sm' ? 8 : 10) : 60);
    const extraGap = size === 'sm' ? 6 : 8;
    const calculatedDistance = Math.max(labelWidth + extraGap, 40);
    setTravelDistance(calculatedDistance);

    // Secuencia de animación de deglución
    setAnimState('eating');

    // Duración del trayecto de deglución: 440ms
    setTimeout(() => {
      if (!isMountedRef.current) return;
      setAnimState('chomp');

      // Tapa se cierra de golpe con spring + breve pausa háptica (150ms) antes de confirmar
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setAnimState('done');
        onConfirm?.();
      }, 150);
    }, 440);
  };

  const isEating = animState === 'eating';
  const isChomp = animState === 'chomp';
  const isDone = animState === 'done';
  const isBusy = isEating || isChomp || isDone || isLoading;

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 15 : 18;
  const fallbackDistance = (typeof label === 'string' ? label.length * 9 : 60) + (isSmall ? 6 : 8);
  const finalDistance = travelDistance > 0 ? travelDistance : fallbackDistance;

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className={`bin-eat-button click-press ${className}`}
      onClick={handleClick}
      disabled={disabled || isBusy}
      aria-label={ariaLabel || (typeof label === 'string' ? label : 'Eliminar')}
      aria-busy={isBusy}
      whileHover={
        !disabled && !isBusy
          ? {
              scale: 1.02,
              boxShadow: '0 0 20px rgba(255, 59, 48, 0.45), inset 0 0 12px rgba(255, 59, 48, 0.18)'
            }
          : {}
      }
      whileTap={!disabled && !isBusy ? { scale: 0.98 } : {}}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? '6px' : '10px',
        height: isSmall ? '36px' : '44px',
        padding: isSmall ? '0 16px' : '0 24px',
        borderRadius: '50px',
        background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.18) 0%, rgba(220, 38, 38, 0.08) 100%)',
        border: '1px solid var(--accent-danger, #ef4444)',
        color: 'var(--accent-danger, #ef4444)',
        fontSize: isSmall ? '0.74rem' : '0.84rem',
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        overflow: 'hidden',
        boxShadow: '0 4px 18px rgba(255, 59, 48, 0.22), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'border-color 0.25s ease, background 0.25s ease, opacity 0.2s ease, box-shadow 0.25s ease',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Resplandor orbital interno durante el mordisco */}
      <AnimatePresence>
        {(isEating || isChomp) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(255, 59, 48, 0.3) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />
        )}
      </AnimatePresence>

      {/* Contenedor del bote de basura que se desplaza comiendo el texto */}
      <motion.div
        className="bin-icon-wrapper"
        animate={{
          x: isEating || isChomp || isDone ? finalDistance : 0,
          scale: isChomp ? [1, 1.2, 0.95, 1] : isEating ? 1.08 : 1
        }}
        transition={{
          x: { duration: 0.44, ease: [0.25, 1, 0.5, 1] },
          scale: { duration: 0.2, ease: 'easeOut' }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 3,
          position: 'relative'
        }}
      >
        {isLoading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ overflow: 'visible' }}
          >
            {/* TAPA ARTICULADA: se abre hacia arriba y se cierra de golpe con chomp */}
            <motion.g
              style={{ originX: '4px', originY: '6px' }}
              animate={{
                rotate: isEating ? -48 : 0,
                y: isEating ? -3 : 0
              }}
              transition={{
                rotate: isChomp
                  ? { type: 'spring', stiffness: 500, damping: 14 }
                  : { duration: 0.14, ease: 'easeOut' },
                y: isChomp
                  ? { type: 'spring', stiffness: 500, damping: 14 }
                  : { duration: 0.14, ease: 'easeOut' }
              }}
            >
              {/* Manija superior de la tapa */}
              <path d="M9 6V3h6v3" />
              {/* Barra transversal de la tapa */}
              <path d="M3 6h18" />
            </motion.g>

            {/* CUERPO DEL BOTE: recipiente con ranuras */}
            <motion.g
              animate={{
                scaleY: isChomp ? [1, 0.85, 1.05, 1] : 1
              }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{ originY: '20px' }}
            >
              {/* Contorno del bote */}
              <path d="M19 6l-1.5 14a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 6" />
              {/* Ranuras interiores */}
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </motion.g>
          </svg>
        )}
      </motion.div>

      {/* Partículas / migajas deglutidas mientras viaja el bote */}
      {isEating && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0],
            x: [0, -6, -12],
            y: [-2, 1, -1]
          }}
          transition={{ repeat: Infinity, duration: 0.22 }}
          style={{
            position: 'absolute',
            left: '26px',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: 'var(--accent-danger, #ef4444)',
            zIndex: 4,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* TEXTO DE LA ETIQUETA: efecto de deglución progresiva mediante clip-path */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          zIndex: 2
        }}
      >
        <motion.span
          ref={labelRef}
          animate={{
            clipPath:
              isEating || isChomp || isDone
                ? 'inset(0 0 0 100%)'
                : 'inset(0 0 0 0%)',
            opacity: isEating || isChomp || isDone ? 0.3 : 1
          }}
          transition={{
            clipPath: { duration: 0.44, ease: [0.25, 1, 0.5, 1] },
            opacity: { duration: 0.44, ease: 'easeIn' }
          }}
          style={{
            whiteSpace: 'nowrap',
            display: 'inline-block',
            textShadow: '0 0 10px rgba(255, 59, 48, 0.4)'
          }}
        >
          {label}
        </motion.span>
      </div>
    </motion.button>
  );
};

export default BinEatButton;
