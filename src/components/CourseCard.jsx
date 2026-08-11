import React, { useState } from 'react';
import { Hash, Building2, User, Pencil, Trash2, BookOpen } from 'lucide-react';
import { playClick } from '../lib/audioService';

export const CourseCard = ({ course, onDelete, onEdit, t }) => {
  const [isHovered, setIsHovered] = useState(false);
  const displayColor = course.color || '#ff0000';
  const displayName = course.name || 'Sin Nombre';

  return (
    <div 
      className="glass-panel glass-card-hover animate-fade-in" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '160px',
        transition: 'all 0.4s var(--ease-out-quint)',
        padding: 0,
        boxShadow: isHovered ? `0 16px 32px rgba(0,0,0,0.4), inset 0 0 20px ${displayColor}1A` : `0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
        borderRadius: '24px'
      }}
    >
      {/* Resplandor radial de fondo (Inyectado en Hover) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        background: `radial-gradient(circle at 10% 50%, ${displayColor}20 0%, transparent 60%)`,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* BLOQUE IZQUIERDO: PORTADA DE LIBRO NEÓN 3D */}
      <div style={{
        width: '76px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${displayColor}`,
        background: `linear-gradient(135deg, ${displayColor}1A 0%, rgba(255,255,255,0.02) 100%)`,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        transform: isHovered ? 'translateX(-2px)' : 'translateX(0)',
        transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        zIndex: 1,
        boxShadow: isHovered ? `inset 0 0 20px ${displayColor}33, 4px 0 15px rgba(0,0,0,0.3)` : `inset 0 0 10px ${displayColor}1A, 2px 0 10px rgba(0,0,0,0.15)`
      }}>
        {/* Simulación de relieve del lomo */}
        <div style={{ position: 'absolute', left: '0', top: 0, bottom: 0, width: '4px', background: `linear-gradient(90deg, rgba(255,255,255,0.4) 0%, transparent 100%)`, opacity: 0.5 }} />
        
        <BookOpen 
          size={28} 
          color={displayColor} 
          style={{ 
            filter: isHovered ? `drop-shadow(0 0 16px ${displayColor})` : `drop-shadow(0 0 8px ${displayColor})`,
            transition: 'all 0.4s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }} 
        />
      </div>

      {/* CUERPO INTERNO Y TIPOGRAFÍA */}
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        
        {/* Fila superior: Código y Botones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
            <Hash size={14} style={{ color: displayColor, opacity: 0.8 }} /> {course.code || 'S/C'}
          </span>
          
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              className="btn-icon"
              title="Editar materia"
              onClick={(e) => { e.stopPropagation(); playClick(1000); onEdit(course); }}
            >
              <Pencil size={15} />
            </button>
            <button className="btn-icon-danger" title={t.delete} onClick={(e) => { e.stopPropagation(); playClick(600); onDelete(course.id); }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Centro: Nombre de Materia */}
        <h3 style={{ margin: '0 0 16px', fontSize: '1.35rem', color: '#ffffff', fontFamily: 'var(--font-display)', textTransform: 'uppercase', lineHeight: 1.25, wordBreak: 'break-word', fontWeight: 900 }}>
          {displayName}
        </h3>

        {/* Fila inferior: Entidad y Profesor */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={14} color={displayColor} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.institution || 'No Asignada'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={14} color={displayColor} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.teacher || 'Sin Profesor'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
