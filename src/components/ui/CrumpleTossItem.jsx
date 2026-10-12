import React, { useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * CrumpleTossItem - Microinteracción "Crumple & Toss"
 * Inspirada en la física de arrugado de papel y proyección parabólica hacia la papelera.
 *
 * Mecánica:
 * - Cuando `isCrumpled` es true, el elemento se encoge con rotación angular física sutil (bola de papel),
 *   adquiere un filtro de contraste/arrugado y se proyecta hacia abajo en una trayectoria fluida.
 * - Su espacio en el layout colapsa suavemente para que los demás elementos suban con fluidez.
 * - Si el usuario pulsa "Deshacer", se desenvuelve elásticamente y vuelve a su posición original intacto.
 * - Respeta `prefers-reduced-motion` pasando a un fade out simple sin giros físicos.
 *
 * Accesibilidad:
 * - `aria-hidden={isCrumpled}` para evitar que los lectores de pantalla interactúen con el elemento en papelera.
 */
const CrumpleTossItem = ({
  children,
  isCrumpled = false,
  onAnimationComplete,
  className = '',
  style = {},
  as = 'div'
}) => {
  const containerRef = useRef(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const outerVariants = prefersReducedMotion
    ? {
        normal: {
          opacity: 1,
          height: 'auto',
          transition: { duration: 0.2 }
        },
        crumpled: {
          opacity: 0,
          height: 0,
          overflow: 'hidden',
          transition: { duration: 0.25 }
        }
      }
    : {
        normal: {
          opacity: 1,
          height: 'auto',
          marginBottom: 'inherit',
          transition: {
            duration: 0.35,
            ease: [0.25, 1, 0.5, 1]
          }
        },
        crumpled: {
          opacity: [1, 1, 0],
          height: 0,
          marginBottom: 0,
          transition: {
            duration: 0.5,
            ease: [0.32, 0, 0.67, 0],
            times: [0, 0.6, 1],
            height: { delay: 0.2, duration: 0.3, ease: 'easeInOut' },
            marginBottom: { delay: 0.2, duration: 0.3, ease: 'easeInOut' }
          }
        }
      };

  const innerVariants = prefersReducedMotion
    ? {
        normal: { scale: 1 },
        crumpled: { scale: 0.95 }
      }
    : {
        normal: {
          scale: 1,
          rotate: 0,
          y: 0,
          filter: 'contrast(1) brightness(1)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.1)',
          transition: {
            type: 'spring',
            damping: 20,
            stiffness: 320,
            mass: 0.8
          }
        },
        crumpled: {
          scale: [1, 0.82, 0.36, 0.1],
          rotate: [0, -8, 14, 26],
          y: [0, -10, 36, 110],
          filter: [
            'contrast(1) brightness(1)',
            'contrast(1.2) brightness(0.96)',
            'contrast(1.4) brightness(0.9)',
            'contrast(1.6) brightness(0.8)'
          ],
          boxShadow: [
            '0 4px 18px rgba(0,0,0,0.1)',
            '0 12px 28px rgba(0,0,0,0.25)',
            '0 4px 12px rgba(0,0,0,0.3)',
            '0 0 0 rgba(0,0,0,0)'
          ],
          transition: {
            duration: 0.48,
            ease: [0.32, 0, 0.67, 0],
            times: [0, 0.25, 0.65, 1]
          }
        }
      };

  const MotionComponent = motion[as] || motion.div;

  return (
    <MotionComponent
      ref={containerRef}
      className={`crumple-toss-wrapper ${className}`}
      layout="position"
      initial={false}
      animate={isCrumpled ? 'crumpled' : 'normal'}
      variants={outerVariants}
      aria-hidden={isCrumpled}
      onAnimationComplete={() => {
        if (isCrumpled && onAnimationComplete) {
          onAnimationComplete();
        }
      }}
      style={{
        overflow: isCrumpled ? 'hidden' : 'visible',
        willChange: 'height, opacity',
        ...style
      }}
    >
      <motion.div
        className="crumple-toss-inner"
        variants={innerVariants}
        animate={isCrumpled ? 'crumpled' : 'normal'}
        style={{
          transformOrigin: '50% 50%',
          willChange: 'transform, filter'
        }}
      >
        {children}
      </motion.div>
    </MotionComponent>
  );
};

export default CrumpleTossItem;
