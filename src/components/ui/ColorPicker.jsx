import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const COLOR_GROUPS = [
  { label: 'Vibrantes', colors: ['#FF5E5E', '#FFB35E', '#FFEB5E', '#B3FF5E', '#5EFF5E', '#5EFFB3', '#5EFAFF'] },
  { label: 'Océano', colors: ['#5EB3FF', '#5E5EFF', '#B35EFF', '#FF5EFF', '#FF5EB3', '#7C3AED', '#2563EB'] },
  { label: 'Pasteles', colors: ['#FCA5A5', '#FDBA74', '#FDE047', '#BEF264', '#86EFAC', '#67E8F9', '#93C5FD'] },
  { label: 'Elegantes', colors: ['#A5B4FC', '#C4B5FD', '#F9A8D4', '#FDA4AF', '#DB2777', '#4F46E5', '#059669'] },
  { label: 'Neutrales', colors: ['#E5E7EB', '#9CA3AF', '#4B5563', '#1F2937', '#000000', '#D97706', '#DC2626'] }
];

const ColorPicker = ({ selectedColor, onSelect, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass-top)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
      >
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: selectedColor, border: '1px solid rgba(255,255,255,0.2)' }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>{t.tetherColor}</span>
        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }} />
      </button>

      {isOpen && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '20px',
          background: 'var(--bg-secondary)',
          backdropFilter: 'blur(100px)',
          border: '1px solid var(--border-glass-top)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {COLOR_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: '18px' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.label}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {group.colors.map(c => (
                  <div
                    key={c}
                    onClick={() => {
                      onSelect(c);
                      setIsOpen(false);
                    }}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: c,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: selectedColor === c ? `0 0 15px ${c}aa` : 'none',
                      transition: 'transform 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {selectedColor === c && <Check size={14} color={['#ffffff', '#E5E7EB', '#FDE047'].includes(c) ? '#000' : '#fff'} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
