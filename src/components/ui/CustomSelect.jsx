/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Select custom estilizado con el look cyber-luxe de CampusFlow.
 * Reemplaza <select> nativos que muestran el popup feo del sistema operativo
 * (fondo blanco/azul) en móvil. Ahora el desplegable usa el mismo estilo que
 * los dropdowns de Pomodoro (Objetivo de estudio / Ambiente Sonoro).
 *
 * @param {string} value - id de la opción seleccionada actualmente.
 * @param {(value: string) => void} onChange - callback al seleccionar una opción.
 * @param {{ value: string, label: string }[]} options - opciones disponibles.
 * @param {string} [placeholder] - texto cuando no hay selección.
 * @param {boolean} [required] - si es obligatorio (visual, no valida por sí solo).
 * @param {object} [style] - estilos adicionales al contenedor raíz.
 */
const CustomSelect = ({ value, onChange, options, placeholder = 'Selecciona...', required, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger button */}
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-body)',
          background: 'rgba(8, 10, 18, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: isOpen ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          transition: 'all 0.2s ease',
          outline: 'none',
          minHeight: '48px',
          boxShadow: isOpen ? '0 0 12px rgba(0, 243, 255, 0.15)' : 'none',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.6,
            color: '#00f3ff'
          }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-select-dropdown"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 200,
              background: 'rgba(8, 10, 18, 0.98)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(0, 243, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(0, 243, 255, 0.06)',
              padding: '6px',
              maxHeight: 'min(260px, 45vh)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(0, 243, 255, 0.14)' : 'transparent',
                    color: isSelected ? '#00f3ff' : 'rgba(255, 255, 255, 0.88)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-body)',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    minHeight: '44px',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </span>
                  {isSelected && <Check size={16} style={{ color: '#00f3ff', flexShrink: 0 }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
