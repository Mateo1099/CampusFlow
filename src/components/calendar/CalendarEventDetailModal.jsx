import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, BookOpen, AlertCircle, Flame, Eye,
  CheckCircle2, ExternalLink, Trash2, ListTodo, Layers, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getTaskDate, getTaskTime, getTaskInstitution, getInstitutionTheme,
  getTaskPriority, formatLongDate
} from './calendarUtils';
import { playClick } from '../../lib/audioService';

const STATUS_OPTIONS = [
  { id: 'sin entregar', label: 'Sin Entregar', color: '#f59e0b', icon: AlertCircle },
  { id: 'en proceso', label: 'En Proceso', color: '#06b6d4', icon: Flame },
  { id: 'revisión', label: 'En Revisión', color: '#a855f7', icon: Eye },
  { id: 'entregado', label: 'Entregado', color: '#10b981', icon: CheckCircle2 }
];

export default function CalendarEventDetailModal({
  isOpen,
  onClose,
  task,
  courses = [],
  onUpdateStatus,
  onUpdateSubtasks,
  onDeleteTask,
  onOpenFullDrawer
}) {
  const [subtasks, setSubtasks] = useState(() => (Array.isArray(task?.subtasks) ? task.subtasks : []));
  const [prevId, setPrevId] = useState(task?.id);

  if (task?.id !== prevId) {
    setPrevId(task?.id);
    setSubtasks(Array.isArray(task?.subtasks) ? task.subtasks : []);
  }

  if (!isOpen || !task) return null;

  const course = courses.find(c => c.id === task.course_id) || task.courses;
  const institution = getTaskInstitution(task, courses);
  const theme = getInstitutionTheme(institution);
  const dateStr = getTaskDate(task);
  const timeStr = getTaskTime(task);
  const priority = getTaskPriority(task);
  const currentStatus = (task.status || 'sin entregar').toLowerCase();

  const handleStatusChange = async (newStatus) => {
    try {
      playClick(1000);
      await onUpdateStatus(task.id, newStatus);
      toast.success(`Estado actualizado a: ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar estado');
    }
  };

  const handleToggleSubtask = async (index) => {
    const updated = subtasks.map((st, i) => (i === index ? { ...st, completed: !st.completed } : st));
    setSubtasks(updated);
    playClick(1200);
    try {
      if (onUpdateSubtasks) {
        await onUpdateSubtasks(task.id, updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Seguro que deseas eliminar la entrega "${task.title}"?`)) return;
    try {
      playClick(600);
      await onDeleteTask(task.id);
      toast.info('Entrega eliminada');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar la entrega');
    }
  };

  const deliveryUrl = task.delivery_url || (task.task_notes?.startsWith('http') ? task.task_notes : null);
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 15, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '560px',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(11, 15, 29, 0.98))',
            borderRadius: '24px',
            border: `1px solid ${theme.border}`,
            boxShadow: `0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px ${theme.glow}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: `linear-gradient(90deg, ${theme.bg}, rgba(255, 255, 255, 0.01))`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {/* Institution Badge */}
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    background: theme.badgeBg,
                    color: theme.color,
                    border: `1px solid ${theme.border}`,
                    boxShadow: `0 0 10px ${theme.glow}`,
                    textTransform: 'uppercase'
                  }}
                >
                  {institution}
                </span>

                {/* Priority Badge */}
                {priority && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: `${priority.color}18`,
                      color: priority.color,
                      border: `1px solid ${priority.color}44`
                    }}
                  >
                    {priority.label}
                  </span>
                )}
              </div>

              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                {task.title}
              </h2>

              {course && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: course.color || theme.color,
                      boxShadow: `0 0 8px ${course.color || theme.color}`
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {course.name} {course.code ? `(${course.code})` : ''}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Body */}
          <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Fecha y Hora */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: theme.color }}><Calendar size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha de Entrega</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                    {formatLongDate(dateStr) || 'Sin fecha'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: '#00f3ff' }}><Clock size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hora Límite</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                    {timeStr ? `${timeStr} hrs` : 'Todo el día'}
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Estado */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Estado de la Entrega
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = currentStatus === opt.id || (opt.id === 'entregado' && currentStatus === 'submitted');
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleStatusChange(opt.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: isActive ? `1.5px solid ${opt.color}` : '1px solid rgba(255,255,255,0.06)',
                        background: isActive ? `${opt.color}1c` : 'rgba(255,255,255,0.02)',
                        color: isActive ? opt.color : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isActive ? `0 0 14px ${opt.color}33` : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtareas / Desglose de ejercicios */}
            {subtasks.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <ListTodo size={14} /> Desglose de Ejercicios
                  </div>
                  <span style={{ fontSize: '0.75rem', color: theme.color, fontWeight: 700 }}>
                    {completedSubtasks}/{subtasks.length} ({Math.round((completedSubtasks / subtasks.length) * 100)}%)
                  </span>
                </div>

                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(completedSubtasks / subtasks.length) * 100}%`,
                      background: theme.color,
                      boxShadow: `0 0 8px ${theme.color}`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {subtasks.map((st, i) => (
                    <div
                      key={st.id || i}
                      onClick={() => handleToggleSubtask(i)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: st.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${st.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        color: st.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: st.completed ? 'line-through' : 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!st.completed}
                        onChange={() => {}}
                        style={{ accentColor: theme.color, cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>{st.text || st.title || `Ejercicio #${i + 1}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enlace o notas */}
            {(deliveryUrl || task.task_notes) && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Notas / Entrega
                </div>
                {deliveryUrl && (
                  <a
                    href={deliveryUrl.startsWith('http') ? deliveryUrl : `https://${deliveryUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#00f3ff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      marginTop: '4px',
                      wordBreak: 'break-all'
                    }}
                  >
                    <ExternalLink size={14} /> Abrir enlace de entrega
                  </a>
                )}
                {!deliveryUrl && task.task_notes && (
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {task.task_notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '18px 28px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={handleDelete}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={14} /> Eliminar
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              {onOpenFullDrawer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullDrawer(task);
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '12px',
                    background: 'rgba(0, 243, 255, 0.1)',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    color: '#00f3ff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Layers size={14} /> Desglose Completo
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
