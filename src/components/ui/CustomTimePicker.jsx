import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, Minus, Check } from 'lucide-react';

const CustomTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const accentColor = '#00f3ff';
  

  // Parse initial value (HH:MM in 24h format)
  const parseInitialTime = () => {
    if (!value) return { hour: 12, minute: 0, isPM: false };
    const [h, m] = value.split(':').map(Number);
    const isPM = h >= 12;
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return { hour, minute: m || 0, isPM };
  };

  const [timeState, setTimeState] = useState(parseInitialTime());

  // Update internal state if value prop changes
  useEffect(() => {
    if (value) {
      setTimeState(parseInitialTime());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const updateHour = (delta) => {
    setTimeState(prev => {
      let newHour = prev.hour + delta;
      if (newHour > 12) newHour = 1;
      if (newHour < 1) newHour = 12;
      return { ...prev, hour: newHour };
    });
  };

  const updateMinute = (delta) => {
    setTimeState(prev => {
      let newMinute = prev.minute + delta;
      if (newMinute > 59) newMinute = 0;
      if (newMinute < 0) newMinute = 59;
      return { ...prev, minute: newMinute };
    });
  };

  const toggleAmPm = () => {
    setTimeState(prev => ({ ...prev, isPM: !prev.isPM }));
  };

  const handleConfirm = () => {
    let h = timeState.hour;
    if (timeState.isPM && h !== 12) h += 12;
    if (!timeState.isPM && h === 12) h = 0;
    
    const formattedTime = `${h.toString().padStart(2, '0')}:${timeState.minute.toString().padStart(2, '0')}`;
    onChange(formattedTime);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '12px',
          border: `1px solid ${isOpen ? accentColor : 'rgba(255,255,255,0.1)'}`,
          background: isOpen ? `${accentColor}1A` : 'rgba(0,0,0,0.3)',
          color: isOpen ? '#fff' : 'var(--text-primary)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s',
          boxShadow: isOpen ? `0 0 12px ${accentColor}33` : 'none'
        }}
      >
        <Clock size={16} color={isOpen ? accentColor : 'rgba(255,255,255,0.5)'} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'sans-serif' }}>
          {value || '00:00'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: 0,
              zIndex: 100,
              background: 'linear-gradient(135deg, rgba(15,15,20,0.95), rgba(10,10,12,0.98))',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${accentColor}40`,
              borderRadius: '20px',
              padding: '20px',
              boxShadow: `0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px ${accentColor}10`,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              minWidth: '240px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              {/* Horas */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button type="button" onClick={() => updateHour(1)} style={controlBtnStyle(accentColor)}><Plus size={16} /></button>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', width: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                  {timeState.hour.toString().padStart(2, '0')}
                </div>
                <button type="button" onClick={() => updateHour(-1)} style={controlBtnStyle(accentColor)}><Minus size={16} /></button>
              </div>

              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', paddingBottom: '20px' }}>:</div>

              {/* Minutos */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button type="button" onClick={() => updateMinute(5)} style={controlBtnStyle(accentColor)}><Plus size={16} /></button>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', width: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                  {timeState.minute.toString().padStart(2, '0')}
                </div>
                <button type="button" onClick={() => updateMinute(-5)} style={controlBtnStyle(accentColor)}><Minus size={16} /></button>
              </div>

              {/* AM/PM */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                <button
                  type="button"
                  onClick={toggleAmPm}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${accentColor}40`,
                    background: `${accentColor}1A`,
                    color: accentColor,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: `inset 0 0 10px ${accentColor}20`
                  }}
                >
                  {timeState.isPM ? 'PM' : 'AM'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: accentColor,
                color: '#000',
                fontWeight: 800,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: `0 4px 15px ${accentColor}66`
              }}
            >
              <Check size={18} /> Confirmar Hora
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const controlBtnStyle = () => ({
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

export default CustomTimePicker;
