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
  const [activePicker, setActivePicker] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const modalPanelRef = useRef(null);
  const closeIconRef = useRef(null);

  useEffect(() => {
    if (show) {
      const isCustomInst = !INSTITUTIONS.includes(formData.institution) && formData.institution !== '';
      setShowCustom(isCustomInst);
    }
  }, [show, formData.institution]);

  const handleClose = () => {
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

  if (!show) return null;

  return (
    <div className="animate-backdrop" style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.8)', 
      zIndex: 9999, 
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <motion.div 
        ref={modalPanelRef} 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="glass-panel gamer-glow" 
        style={{ 
          width: '90%', 
          maxWidth: '520px', 
          padding: '40px', 
          background: 'rgba(12, 12, 12, 0.9)', 
          borderRadius: '24px',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          position: 'relative',
          zIndex: 10000,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 243, 255, 0.15)',
          maxHeight: '90vh',
          overflow: 'visible'
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>NOMBRE DEL CURSO *</label>
            <input 
              className="input" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="Ej. Cálculo Diferencial" 
              style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>CÓDIGO</label>
              <input 
                className="input" 
                value={formData.code} 
                onChange={e => setFormData({ ...formData, code: e.target.value })} 
                placeholder="100410" 
                style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>INSTITUCIÓN</label>
              <select 
                className="select" 
                value={formData.institution} 
                onChange={e => handleInstitutionChange(e.target.value)}
                style={{ 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  color: '#fff',
                  padding: '14px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  appearance: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {INSTITUTIONS.map(inst => <option key={inst} value={inst} style={{ background: '#121212' }}>{inst}</option>)}
                <option value="PERSONALIZADO" style={{ background: '#121212' }}>PERSONALIZADO</option>
              </select>
            </div>
          </div>

          {showCustom && (
            <div className="animate-fade-in">
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>NOMBRE INSTITUCIÓN</label>
              <input 
                className="input" 
                value={formData.customInstitution || ''} 
                onChange={e => setFormData({ ...formData, customInstitution: e.target.value })} 
                placeholder="Ej. Universidad Nacional" 
                style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} 
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>PROFESOR *</label>
            <input 
              className="input" 
              required 
              value={formData.teacher} 
              onChange={e => setFormData({ ...formData, teacher: e.target.value })} 
              placeholder="Ej. Ing. Mauricio Silva" 
              style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>FECHA DE CREACIÓN</label>
            <div 
              onClick={() => setActivePicker('created_at')} 
              className="input" 
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {formData.created_at || 'SELECCIONAR FECHA...'} 
              <CalendarIcon size={16} color="#00f3ff" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#00f3ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>COLOR DE IDENTIFICACIÓN</label>
            <ColorPicker 
              selectedColor={formData.color} 
              onSelect={(color) => setFormData({ ...formData, color: color })}
              t={t} 
            />
          </div>

          {activePicker && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10002 }}>
              <CustomCalendar 
                selectedDate={formData.created_at} 
                onDateSelect={(d) => { 
                  setFormData({ ...formData, created_at: d.split('T')[0] }); 
                  setActivePicker(null); 
                }} 
                onClose={() => setActivePicker(null)} 
              />
            </div>
          )}

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
  );
};

const ModalButton = ({ label, onClick, type = "button", variant, disabled }) => {
  const btnRef = useRef(null);
  
  useGSAP(() => {
    if (!btnRef.current || disabled) return;
    const btn = btnRef.current;
    const tl = gsap.timeline({ paused: true });
    
    if (variant === 'save') {
      tl.to(btn, { 
        backgroundColor: 'rgba(0, 243, 255, 0.2)', 
        boxShadow: '0 0 20px rgba(0, 243, 255, 0.6)', 
        duration: 0.3, 
        ease: "slow(0.7, 0.7, false)" 
      });
    } else {
      tl.to(btn, { 
        backgroundColor: 'rgba(255, 77, 77, 0.15)', 
        boxShadow: '0 0 15px rgba(255, 77, 77, 0.4)', 
        borderColor: 'rgba(255, 77, 77, 0.6)', 
        duration: 0.3, 
        ease: "power2.out" 
      });
    }
    
    const enter = () => tl.play();
    const leave = () => tl.reverse();
    
    btn.addEventListener("mouseenter", enter);
    btn.addEventListener("mouseleave", leave);
    
    return () => { 
      btn.removeEventListener("mouseenter", enter); 
      btn.removeEventListener("mouseleave", leave); 
    };
  }, [variant, disabled]);

  return (
    <button 
      ref={btnRef} 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      style={{ 
        padding: '12px 32px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        background: variant === 'save' ? 'rgba(0, 243, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
        color: variant === 'save' ? '#00f3ff' : '#ff4d4d',
        border: `1px solid ${variant === 'save' ? '#00f3ff33' : '#ff4d4d33'}`,
        opacity: disabled ? 0.5 : 1,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {variant === 'save' ? (label.includes('GUARDAR') ? <Save size={16} /> : <Plus size={16} />) : <X size={16} />}
      {label}
    </button>
  );
};

export default CourseModal;
