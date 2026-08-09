import React from 'react';
import { Hash, Building2, User, Pencil, Trash2 } from 'lucide-react';
import { playClick } from '../lib/audioService';

export const CourseCard = ({ course, onDelete, onEdit, t }) => {
  const displayColor = course.color || '#ff0000';
  const displayName = course.name || 'Sin Nombre';

  return (
    <div className="glass-panel glass-card-hover animate-fade-in" style={{
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'visible',
      minHeight: '160px',
      transition: 'all 0.4s var(--ease-out-quint)'
    }}>
      {/* Barra de color lateral con brillo */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: displayColor, boxShadow: `0 0 15px ${displayColor}`, borderRadius: '32px 0 0 32px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontWeight: 800 }}>
            <Hash size={10} style={{ color: displayColor }} /> {course.code || 'S/C'}
          </span>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', lineHeight: 1.2, wordBreak: 'break-word', fontWeight: 900 }}>{displayName}</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Building2 size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.institution || 'No Asignada'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.teacher || 'Sin Profesor'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            className="btn-icon"
            title="Editar materia"
            onClick={() => { playClick(1000); onEdit(course); }}
          >
            <Pencil size={15} />
          </button>
          <button className="btn-icon-danger" title={t.delete} onClick={() => { playClick(600); onDelete(course.id); }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
