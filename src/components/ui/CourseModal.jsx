import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Save, Plus, Building2, User, Hash, Pencil } from 'lucide-react';
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import ColorPicker from './ColorPicker';
import CustomCalendar from './CustomCalendar';

const INSTITUTIONS = ['UNAD', 'SENA'];

const CourseModal = ({ 
  show, 
  onClose, 
  isEditing, 
  formData, 
  setFormData, 
  handleSubmit, 
  t 
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const modalPanelRef = useRef(null);
  const closeIconRef = useRef(null);
  const dateInputRef = useRef(null);

  useEffect(() => {
    if (show) {
      const isCustomInst = !INSTITUTIONS.includes(formData.institution) && formData.institution !== '';
      setShowCustom(isCustomInst);
      // Bloqueo de scroll cuando modal abre
      document.body.style.overflow = 'hidden';
    } else {
      // Liberar scroll cuando modal cierra
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      // Cleanup: asegurar que scroll se libera
      document.body.style.overflow = 'unset';
    };
  }, [show, formData.institution]);

  const handleClose = () => {
    setShowCalendar(false);
    if (!modalPanelRef.current || !closeIconRef.current) {
      onClose();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => onClose()
    });

    tl.to(closeIconRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut"
    }, 0);

    tl.to(modalPanelRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      ease: "power2.inOut"
    }, 0);
  };

  const handleInstitutionChange = (val) => {
    setFormData({ ...formData, institution: val });
    setShowCustom(val === 'PERSONALIZADO' || (val !== 'UNAD' && val !== 'SENA' && val !== ''));
  };

  const handleDatePickerClick = () => {
    setShowCalendar(true);
    setShowColorPicker(false);
  };

  if (!show && !showCalendar) return null;

  return (
    <>
      {show && (
        <AnimatePresence>
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backgroundColor: 'rgba(0,0,0,0.6)'
          }}>
            <motion.div 
              key="course-modal"
              ref={modalPanelRef} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{ 
                width: '480px',
                maxWidth: '95vw',
                background: 'rgba(15, 15, 20, 0.95)', 
                borderRadius: '24px',
                border: '1px solid rgba(0, 243, 255, 0.35)',
                padding: '40px',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 0 30px rgba(0, 243, 255, 0.3), 0 0 15px rgba(0, 243, 255, 0.15), 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)',
                maxHeight: '85vh',
                overflowY: 'auto',
                marginTop: 'auto',
                marginBottom: 'auto'
              }}
            >

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#00f3ff', fontWeight: 950, textShadow: '0 0 10px rgba(0, 243, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEditing ? <Pencil size={24} /> : <Plus size={24} />}
            {isEditing ? 'EDITAR MATERIA' : 'NUEVA MATERIA'}
          </h2>
          <button 
            onClick={handleClose} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div ref={closeIconRef} style={{ display: 'flex', filter: 'drop-shadow(0 0 8px #ff0033)' }}>
              <X size={28} color="#ff0033" strokeWidth={3} />
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850 }}>NOMBRE DEL CURSO *</label>
            <input 
              className="input" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="Ej. Cálculo Diferencial" 
              style={{ background: 'rgba(255,255,255,0.04)', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0, 243, 255, 0.15)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', cursor: 'text', width: '100%' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850 }}>CÓDIGO</label>
              <input 
                className="input" 
                value={formData.code} 
                onChange={e => setFormData({ ...formData, code: e.target.value })} 
                placeholder="100410" 
                style={{ background: 'rgba(255,255,255,0.04)', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0, 243, 255, 0.15)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', cursor: 'text' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850 }}>INSTITUCIÓN</label>
              <select 
                className="select" 
                value={formData.institution} 
                onChange={e => handleInstitutionChange(e.target.value)}
                style={{ 
                  background: 'rgba(255,255,255,0.04)', 
                  color: '#fff',
                  padding: '14px 16px', 
                  borderRadius: '14px',
                  border: '1px solid rgba(0, 243, 255, 0.15)',
                  appearance: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                {INSTITUTIONS.map(inst => <option key={inst} value={inst} style={{ background: '#121212' }}>{inst}</option>)}
                <option value="PERSONALIZADO" style={{ background: '#121212' }}>PERSONALIZADO</option>
              </select>
            </div>
          </div>

          {showCustom && (
            <div className="animate-fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850 }}>NOMBRE INSTITUCIÓN</label>
              <input 
                className="input" 
                value={formData.customInstitution || ''} 
                onChange={e => setFormData({ ...formData, customInstitution: e.target.value })} 
                placeholder="Ej. Universidad Nacional" 
                style={{ background: 'rgba(255,255,255,0.04)', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0, 243, 255, 0.15)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', cursor: 'text', width: '100%' }} 
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850 }}>PROFESOR *</label>
            <input 
              className="input" 
              required 
              value={formData.teacher} 
              onChange={e => setFormData({ ...formData, teacher: e.target.value })} 
              placeholder="Ej. Ing. Mauricio Silva" 
              style={{ background: 'rgba(255,255,255,0.04)', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0, 243, 255, 0.15)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', cursor: 'text', width: '100%' }} 
            />
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <label 
              onClick={handleDatePickerClick}
              style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850, cursor: 'pointer' }}>
              FECHA DE CREACIÓN
            </label>
            <div 
              style={{ width: '100%', cursor: 'pointer' }}
              onClick={handleDatePickerClick}
            >
              <div 
                ref={dateInputRef}
                className="input" 
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)', 
                  padding: '14px 16px', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(0, 243, 255, 0.15)', 
                  backdropFilter: 'blur(10px)', 
                  transition: 'all 0.3s ease', 
                  width: '100%',
                  userSelect: 'none',
                  minHeight: '48px'
                }}
              >
                <span>{formData.created_at || 'SELECCIONAR FECHA...'}</span>
                <CalendarIcon size={18} color="#00f3ff" style={{ cursor: 'pointer', flexShrink: 0 }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#00f3ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850 }}>COLOR DE IDENTIFICACIÓN</label>
            <ColorPicker 
              selectedColor={formData.color} 
              onSelect={(color) => setFormData({ ...formData, color: color })}
              isOpen={showColorPicker}
              onToggle={() => { setShowColorPicker(!showColorPicker); setShowCalendar(false); }}
              onClose={() => setShowColorPicker(false)}
              t={t} 
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px' }}>
            <ModalButton label="CANCELAR" onClick={handleClose} variant="cancel" />
            <ModalButton 
              label={isEditing ? "GUARDAR CAMBIOS" : "REGISTRAR"} 
              type="submit" 
              variant="save" 
              disabled={!formData.name || !formData.teacher} 
            />
          </div>
        </form>
      </motion.div>
      </div>
        </AnimatePresence>
      )}

      {showCalendar && (
        <>
          <div 
            onClick={() => setShowCalendar(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 1199,
              background: 'rgba(0,0,0,0.3)'
            }} 
          />
          <div style={{
            position: 'fixed',
            top: '62%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1200,
          }}>
            <CustomCalendar 
              selectedDate={formData.created_at} 
              onDateSelect={(d) => { 
                setFormData({ ...formData, created_at: d }); 
                setShowCalendar(false); 
              }} 
              onClose={() => setShowCalendar(false)} 
            />
          </div>
        </>
      )}
    </>
  );
};

const ModalButton = ({ label, onClick, type = "button", variant, disabled }) => {
  return (
    <motion.button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02, textShadow: variant === 'save' ? '0 0 10px rgba(0, 243, 255, 0.5)' : '0 0 10px rgba(255, 77, 77, 0.3)' } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ hover: { duration: 0.2, ease: "easeOut" }, tap: { duration: 0.1 } }}
      style={{ 
        padding: '12px 32px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        background: variant === 'save' ? 'rgba(0, 243, 255, 0.12)' : 'rgba(255, 77, 77, 0.1)',
        color: variant === 'save' ? '#00f3ff' : '#ff4d4d',
        border: `1px solid ${variant === 'save' ? 'rgba(0, 243, 255, 0.35)' : 'rgba(255, 77, 77, 0.35)'}`,
        opacity: disabled ? 0.5 : 1,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: variant === 'save' 
          ? '0 0 20px rgba(0, 243, 255, 0.15)' 
          : '0 0 20px rgba(255, 77, 77, 0.1)'
      }}
    >
      {variant === 'save' ? (label.includes('GUARDAR') ? <Save size={16} /> : <Plus size={16} />) : <X size={16} />}
      {label}
    </motion.button>
  );
};

export default CourseModal;
