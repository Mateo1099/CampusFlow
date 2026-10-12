import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2, X } from 'lucide-react';

/**
 * UndoToast - Componente individual de Toast flotante con estética Glassmorphism
 * y temporizador visual de reversión para la microinteracción "Crumple & Toss".
 *
 * Accesibilidad:
 * - `role="status"` y `aria-live="polite"` para anuncios discretos de lectores de pantalla.
 * - Soporte de foco por teclado en el botón "Deshacer".
 */
export const UndoToast = ({
  item,
  onUndo,
  onDismiss,
  duration = 5000,
  className = '',
  style = {}
}) => {
  const [progress, setProgress] = useState(100);

  const itemId = item?.id;
  const itemName = item?.name || 'Elemento';
  const itemType = item?.type || 'elemento';
  const effectiveDuration = item?.duration || duration;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / effectiveDuration) * 100);
      setProgress(remainingPercent);

      if (remainingPercent <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [effectiveDuration]);

  const handleUndo = (e) => {
    e?.stopPropagation();
    onUndo?.(itemId);
  };

  const handleDismiss = (e) => {
    e?.stopPropagation();
    onDismiss?.(itemId);
  };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`undo-toast-card glass-panel ${className}`}
      initial={{ opacity: 0, y: 30, scale: 0.94, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(6px)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 20px',
        minWidth: '320px',
        maxWidth: '92vw',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 30, 0.96) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 243, 255, 0.28)',
        borderRadius: '18px',
        boxShadow:
          '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 243, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
        color: 'var(--text-primary)',
        ...style
      }}
    >
      {/* Resplandor orbital superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.8), transparent)',
          pointerEvents: 'none'
        }}
      />

      {/* Contenido izquierdo: icono e información */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: 'rgba(255, 59, 48, 0.14)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-danger, #ef4444)',
            flexShrink: 0,
            boxShadow: '0 0 16px rgba(255, 59, 48, 0.2)'
          }}
        >
          <Trash2 size={18} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '210px'
            }}
          >
            {itemName}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-secondary, rgba(255, 255, 255, 0.6))',
              textTransform: 'capitalize'
            }}
          >
            {itemType} eliminado
          </span>
        </div>
      </div>

      {/* Acciones: Botón Deshacer y Descartar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <motion.button
          type="button"
          onClick={handleUndo}
          aria-label={`Deshacer eliminación de ${itemName}`}
          whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(0, 243, 255, 0.45)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2) 0%, rgba(0, 243, 255, 0.08) 100%)',
            border: '1px solid var(--accent-primary, #00f3ff)',
            color: 'var(--accent-primary, #00f3ff)',
            fontSize: '0.76rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(0, 243, 255, 0.2)',
            transition: 'background 0.2s, border-color 0.2s'
          }}
        >
          <RotateCcw size={14} />
          <span>Deshacer</span>
        </motion.button>

        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar notificación"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, rgba(255, 255, 255, 0.4))',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'color 0.2s'
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Barra de progreso de cuenta regresiva (5 segundos) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2.5px',
          background: 'rgba(255, 255, 255, 0.08)'
        }}
      >
        <motion.div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--accent-danger, #ef4444) 0%, var(--accent-primary, #00f3ff) 100%)',
            boxShadow: '0 0 8px var(--accent-primary, #00f3ff)',
            transition: 'width 0.05s linear'
          }}
        />
      </div>
    </motion.div>
  );
};

/**
 * UndoToastContainer - Gestor y contenedor flotante de toasts de reversión.
 * Se ubica en la parte inferior de la pantalla y renderiza los elementos pendientes.
 */
export const UndoToastContainer = ({
  pendingItems = [],
  onUndo,
  onDismiss,
  position = 'bottom-center'
}) => {
  if (!pendingItems || pendingItems.length === 0) return null;

  const positionStyles = {
    'bottom-center': {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999
    },
    'bottom-right': {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999
    }
  };

  return (
    <div
      className="undo-toast-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        pointerEvents: 'auto',
        ...positionStyles[position]
      }}
    >
      <AnimatePresence>
        {pendingItems.map((item) => (
          <UndoToast
            key={item.id}
            item={item}
            onUndo={onUndo}
            onDismiss={onDismiss}
            duration={item.duration || 5000}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default UndoToast;
