import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Edit2, Trash2, Calendar as CalendarIcon } from 'lucide-react';

export const TaskCard = ({ task, onDelete, onEdit, courses, onDragEnd }) => {
  const courseObj = courses?.find(c => c.id === task.course_id);
  const accentColor = courseObj?.color || 'var(--accent-primary)';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
      if (!datePart) return null;
      const d = new Date(`${datePart}T00:00:00`);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const displayDate = formatDate(task.deadline || task.due_date);

  return (
    <motion.div
      layout
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={(event, info) => onDragEnd(task, info)}
      whileDrag={{ 
        scale: 1.05, 
        rotate: 2, 
        zIndex: 100,
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${accentColor}33`,
      }}
      className="glass-panel task-card-alfa"
      style={{
        padding: 'clamp(14px, 2vw, 20px)',
        marginBottom: '16px',
        borderTop: '1px solid var(--border-glass-top)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        cursor: 'grab',
        touchAction: 'none'
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical size={14} color="var(--text-muted)" className="shrink-0" />
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: `${accentColor}15`, padding: '4px 10px', borderRadius: '6px',
            border: `1px solid ${accentColor}33`, maxWidth: '100%', overflow: 'hidden'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
            <span className="truncate" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800, textTransform: 'uppercase' }}>
              {courseObj?.name || 'General'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <motion.button 
            whileHover={{ 
              scale: 1.02, 
              backgroundColor: 'rgba(0, 243, 255, 0.15)', 
              borderColor: 'rgba(0, 243, 255, 0.5)',
              boxShadow: '0 0 15px rgba(0, 243, 255, 0.4), inset 0 0 8px rgba(0, 243, 255, 0.2)'
            }}
            whileTap={{ scale: 0.98 }}
            className="btn-icon-alfa"
            style={{ 
              opacity: 1, 
              cursor: 'pointer', 
              color: '#00f3ff',
              background: 'rgba(0, 243, 255, 0.02)',
              border: '1px solid rgba(0, 243, 255, 0.1)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s var(--ease-out-quint)'
            }}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          >
            <Edit2 size={15} style={{ filter: 'drop-shadow(0 0 4px rgba(0, 243, 255, 0.5))' }} />
          </motion.button>
          <motion.button 
            whileHover={{ 
              scale: 1.02, 
              backgroundColor: 'rgba(255, 77, 77, 0.15)', 
              borderColor: 'rgba(255, 77, 77, 0.5)',
              boxShadow: '0 0 15px rgba(255, 77, 77, 0.4), inset 0 0 8px rgba(255, 77, 77, 0.2)'
            }}
            whileTap={{ scale: 0.98 }}
            className="btn-icon-alfa"
            style={{ 
              opacity: 1, 
              cursor: 'pointer', 
              color: '#ff4d4d',
              background: 'rgba(255, 77, 77, 0.02)',
              border: '1px solid rgba(255, 77, 77, 0.1)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s var(--ease-out-quint)'
            }}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          >
            <Trash2 size={15} style={{ filter: 'drop-shadow(0 0 4px rgba(255, 77, 77, 0.5))' }} />
          </motion.button>
        </div>
      </div>
      <h4 className="break-words" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</h4>
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
        {displayDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarIcon size={12} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{displayDate}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
