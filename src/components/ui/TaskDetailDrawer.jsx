import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Check, CheckCircle2, 
  Sparkles, Calendar, Clock,
  ArrowUp, ArrowDown, RefreshCw, FileText,
  ListTodo
} from 'lucide-react';

/**
 * TaskDetailDrawer — Drawer Cyber Luxe para Desglose de Ejercicios y Bloc de Notas de Estudio
 * Diseñado bajo el sistema visual Cyber Luxe de CampusFlow (Glassmorphism, gradientes neón, micro-animaciones).
 */
export default function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  courses = [],
  onUpdateSubtasks,
  onUpdateNotes,
}) {
  // Materia asociada
  const courseObj = useMemo(() => {
    if (!task) return null;
    return courses.find(c => c.id === task.course_id) || task.courses || null;
  }, [task, courses]);

  const accentColor = courseObj?.color || 'var(--accent-primary)';

  // Subtareas y Notas en estado local para reactividad inmediata
  const [subtasks, setSubtasks] = useState(() => (Array.isArray(task?.subtasks) ? task.subtasks : []));
  const [notes, setNotes] = useState(() => (typeof task?.task_notes === 'string' ? task.task_notes : ''));
  const [prevTaskId, setPrevTaskId] = useState(task?.id);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [activeTab, setActiveTab] = useState('subtasks'); // 'subtasks' | 'notes'
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  // Sincronizar datos al cambiar de tarea durante render
  if (task?.id !== prevTaskId) {
    setPrevTaskId(task?.id);
    setSubtasks(Array.isArray(task?.subtasks) ? task.subtasks : []);
    setNotes(typeof task?.task_notes === 'string' ? task.task_notes : '');
    setSaveStatus('idle');
  }

  const newSubtaskInputRef = useRef(null);
  const notesTextareaRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Manejo de scroll en body al abrir drawer
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Guardado automático con debounce para task_notes
  const persistNotes = useCallback(async (contentToSave) => {
    if (!task?.id || !onUpdateNotes) return;
    try {
      setSaveStatus('saving');
      await onUpdateNotes(task.id, contentToSave);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('[TaskDetailDrawer] Error guardando notas:', err);
      setSaveStatus('idle');
    }
  }, [task, onUpdateNotes]);

  const handleNotesChange = (e) => {
    const newContent = e.target.value;
    setNotes(newContent);
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistNotes(newContent);
    }, 700);
  };

  const handleManualSaveNotes = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistNotes(notes);
  };

  // Mutaciones de Subtareas
  const persistSubtasks = useCallback(async (updatedList) => {
    if (!task?.id || !onUpdateSubtasks) return;
    try {
      await onUpdateSubtasks(task.id, updatedList);
    } catch (err) {
      console.error('[TaskDetailDrawer] Error guardando subtareas:', err);
    }
  }, [task, onUpdateSubtasks]);

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault();
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;

    const newItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      completed: false,
    };

    const nextList = [...subtasks, newItem];
    setSubtasks(nextList);
    setNewSubtaskText('');
    persistSubtasks(nextList);

    // Mantener foco en el input para agregar más rápido
    setTimeout(() => {
      newSubtaskInputRef.current?.focus();
    }, 50);
  };

  const handleToggleSubtask = (id) => {
    const nextList = subtasks.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleDeleteSubtask = (id) => {
    const nextList = subtasks.filter(item => item.id !== id);
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleMoveSubtask = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;

    const nextList = [...subtasks];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);

    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleToggleAll = () => {
    const areAllCompleted = subtasks.length > 0 && subtasks.every(s => s.completed);
    const nextList = subtasks.map(s => ({ ...s, completed: !areAllCompleted }));
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleClearCompleted = () => {
    const nextList = subtasks.filter(s => !s.completed);
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const insertSnippetAtCursor = (prefix, suffix = '') => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = notes.substring(start, end);
    const replacement = `${prefix}${selected || 'texto'}${suffix}`;

    const newNotes = notes.substring(0, start) + replacement + notes.substring(end);
    setNotes(newNotes);
    persistNotes(newNotes);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 20);
  };

  // Estadísticas de progreso
  const totalSubtasks = subtasks.length;
  const completedCount = subtasks.filter(s => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  // Filtrado de subtareas
  const filteredSubtasks = useMemo(() => {
    if (filter === 'pending') return subtasks.filter(s => !s.completed);
    if (filter === 'completed') return subtasks.filter(s => s.completed);
    return subtasks;
  }, [subtasks, filter]);

  // Formato de fecha de vencimiento y cálculo de prioridad
  const deadlineInfo = useMemo(() => {
    if (!task?.deadline && !task?.due_date) return null;
    const dateStr = task.deadline || task.due_date;
    try {
      const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
      if (!datePart) return null;
      const d = new Date(`${datePart}T00:00:00`);
      const formatted = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffTime = d - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let priorityBadge = { label: 'EN TIEMPO', color: '#00f3ff' };
      if (diffDays <= 3) priorityBadge = { label: 'URGENTE', color: '#ff4d4d' };
      else if (diffDays <= 7) priorityBadge = { label: 'PRÓXIMO', color: '#ffcc00' };

      return { formatted, priorityBadge, diffDays };
    } catch {
      return { formatted: dateStr, priorityBadge: null };
    }
  }, [task]);

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="task-detail-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(5, 7, 14, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-detail-title"
        >
          {/* Panel Lateral Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(16, 20, 32, 0.96) 0%, rgba(10, 12, 20, 0.98) 100%)',
              backdropFilter: 'blur(30px) saturate(190%)',
              WebkitBackdropFilter: 'blur(30px) saturate(190%)',
              borderLeft: '1px solid rgba(0, 243, 255, 0.2)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 243, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Top ambient highlight line */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, transparent, ${accentColor}, var(--accent-secondary), transparent)`,
                boxShadow: `0 0 16px ${accentColor}`,
                zIndex: 10,
              }}
            />

            {/* ─── CABECERA DEL DRAWER ─── */}
            <div 
              style={{
                padding: '24px 28px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                background: 'rgba(255, 255, 255, 0.015)',
              }}
            >
              {/* Fila superior: Materia + Badges + Botón Cerrar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {courseObj?.name && (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 12px',
                        background: `${accentColor}15`,
                        border: `1px solid ${accentColor}40`,
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: accentColor,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        boxShadow: `0 0 12px ${accentColor}25`,
                      }}
                    >
                      <span 
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: accentColor,
                          boxShadow: `0 0 8px ${accentColor}`,
                        }}
                      />
                      <span>{courseObj.name}</span>
                    </div>
                  )}

                  {deadlineInfo?.priorityBadge && task.status !== 'entregado' && (
                    <span 
                      style={{
                        padding: '3px 10px',
                        background: `${deadlineInfo.priorityBadge.color}15`,
                        border: `1px solid ${deadlineInfo.priorityBadge.color}60`,
                        borderRadius: '16px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: deadlineInfo.priorityBadge.color,
                        letterSpacing: '0.06em',
                        boxShadow: `0 0 10px ${deadlineInfo.priorityBadge.color}30`,
                      }}
                    >
                      {deadlineInfo.priorityBadge.label}
                    </span>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 77, 77, 0.15)', borderColor: 'rgba(255, 77, 77, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: 'var(--text-secondary)',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                  }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Título de la Entrega */}
              <h2 
                id="task-detail-title"
                style={{
                  margin: 0,
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {task.title}
              </h2>

              {/* Fecha y estado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {deadlineInfo?.formatted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: accentColor }} />
                    <span>Vence: <strong style={{ color: 'var(--text-primary)' }}>{deadlineInfo.formatted}</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: 'var(--accent-secondary)' }} />
                  <span>Estado: <strong style={{ color: accentColor, textTransform: 'capitalize' }}>{task.status || 'sin entregar'}</strong></span>
                </div>
              </div>

              {/* ─── BARRA DE PROGRESO DINÁMICA ─── */}
              <div 
                style={{
                  marginTop: '4px',
                  padding: '12px 16px',
                  background: 'rgba(0, 243, 255, 0.03)',
                  border: '1px solid rgba(0, 243, 255, 0.12)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                    Progreso de Ejercicios
                  </span>
                  <span style={{ fontWeight: 700, color: progressPercent === 100 && totalSubtasks > 0 ? 'var(--accent-lime)' : 'var(--accent-primary)' }}>
                    {totalSubtasks === 0 
                      ? 'Sin subtareas' 
                      : `${completedCount} de ${totalSubtasks} resueltos · ${progressPercent}%`}
                  </span>
                </div>

                <div 
                  style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: progressPercent === 100 && totalSubtasks > 0
                        ? 'linear-gradient(90deg, #10b981, #00f3ff)'
                        : 'linear-gradient(90deg, #00f3ff, #bc13fe)',
                      borderRadius: '999px',
                      boxShadow: progressPercent > 0 ? '0 0 12px rgba(0, 243, 255, 0.6)' : 'none',
                    }}
                  />
                </div>

                {progressPercent === 100 && totalSubtasks > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} />
                    ¡Todos los ejercicios completados! Trabajo listo para entrega 🚀
                  </motion.div>
                )}
              </div>
            </div>

            {/* ─── NAVEGACIÓN POR PESTAÑAS ─── */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: '8px 24px 0',
                background: 'rgba(255, 255, 255, 0.01)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('subtasks')}
                style={{
                  padding: '12px 16px',
                  background: activeTab === 'subtasks' ? 'rgba(0, 243, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'subtasks' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'subtasks' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <ListTodo size={16} />
                <span>Ejercicios / Subtareas</span>
                {totalSubtasks > 0 && (
                  <span 
                    style={{
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: activeTab === 'subtasks' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                      color: activeTab === 'subtasks' ? '#000' : 'var(--text-primary)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {completedCount}/{totalSubtasks}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '12px 16px',
                  background: activeTab === 'notes' ? 'rgba(188, 19, 254, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'notes' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                  color: activeTab === 'notes' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <FileText size={16} />
                <span>Bloc de Notas</span>
                {notes.trim().length > 0 && (
                  <span 
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent-secondary)',
                      boxShadow: '0 0 6px var(--accent-secondary)',
                    }}
                  />
                )}
              </button>
            </div>

            {/* ─── CONTENIDO DE PESTAÑAS ─── */}
            <div 
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {activeTab === 'subtasks' ? (
                /* ─── SECCIÓN 1: CHECKLIST DE EJERCICIOS / SUBTAREAS ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Formulario de Inserción Rápida */}
                  <form 
                    onSubmit={handleAddSubtask}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(0, 243, 255, 0.2)',
                      borderRadius: '14px',
                      padding: '4px 6px 4px 14px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <input
                      ref={newSubtaskInputRef}
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      placeholder="Escribe un ejercicio... (Enter para agregar)"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-body)',
                        padding: '10px 0',
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={!newSubtaskText.trim()}
                      style={{
                        background: newSubtaskText.trim()
                          ? 'linear-gradient(135deg, #00f3ff 0%, #00a8ff 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: newSubtaskText.trim() ? '#000' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: newSubtaskText.trim() ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        boxShadow: newSubtaskText.trim() ? '0 0 15px rgba(0, 243, 255, 0.4)' : 'none',
                      }}
                    >
                      <Plus size={16} />
                      <span>Agregar</span>
                    </motion.button>
                  </form>

                  {/* Barra de Filtros y Acciones Rápidas */}
                  {totalSubtasks > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingBottom: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'pending', label: 'Pendientes' },
                          { id: 'completed', label: 'Resueltos' }
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              border: filter === f.id ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                              background: filter === f.id ? 'rgba(0, 243, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              color: filter === f.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleToggleAll}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {completedCount === totalSubtasks ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                        {completedCount > 0 && (
                          <button
                            type="button"
                            onClick={handleClearCompleted}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-danger)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Limpiar resueltos
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lista de Ejercicios */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredSubtasks.length === 0 ? (
                      <div 
                        style={{
                          padding: '36px 20px',
                          textAlign: 'center',
                          borderRadius: '16px',
                          border: '1px dashed rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.01)',
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <ListTodo size={32} style={{ opacity: 0.4, color: 'var(--accent-primary)' }} />
                        <span>
                          {totalSubtasks === 0 
                            ? 'No hay ejercicios o subtareas aún. Escribe el primero arriba para desglosar tu entrega paso a paso.'
                            : 'No hay elementos para el filtro seleccionado.'}
                        </span>
                      </div>
                    ) : (
                      filteredSubtasks.map((item, index) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: item.completed 
                              ? 'rgba(16, 185, 129, 0.04)' 
                              : 'rgba(255, 255, 255, 0.03)',
                            border: item.completed 
                              ? '1px solid rgba(16, 185, 129, 0.2)' 
                              : '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.2s',
                          }}
                        >
                          {/* Checkbox y Texto */}
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              flex: 1,
                              minWidth: 0,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleToggleSubtask(item.id)}
                          >
                            {/* Checkbox Cyber Luxe */}
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              style={{
                                width: '22px',
                                height: '22px',
                                minWidth: '22px',
                                borderRadius: '7px',
                                border: item.completed 
                                  ? '2px solid #10b981' 
                                  : '2px solid rgba(0, 243, 255, 0.4)',
                                background: item.completed 
                                  ? '#10b981' 
                                  : 'rgba(0, 243, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#000',
                                boxShadow: item.completed 
                                  ? '0 0 10px rgba(16, 185, 129, 0.5)' 
                                  : 'none',
                                transition: 'all 0.2s',
                              }}
                            >
                              {item.completed && <Check size={14} strokeWidth={3.5} />}
                            </motion.div>

                            {/* Texto del Ejercicio */}
                            <span 
                              style={{
                                fontSize: '0.9rem',
                                color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: item.completed ? 'line-through' : 'none',
                                wordBreak: 'break-word',
                                lineHeight: 1.4,
                                transition: 'all 0.2s',
                              }}
                            >
                              {item.text}
                            </span>
                          </div>

                          {/* Botones de Acción (Reordenar y Eliminar) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', shrink: 0 }}>
                            {/* Subir */}
                            <button
                              type="button"
                              onClick={() => handleMoveSubtask(index, -1)}
                              disabled={index === 0}
                              title="Mover arriba"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: index === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-secondary)',
                                cursor: index === 0 ? 'default' : 'pointer',
                                padding: '4px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <ArrowUp size={14} />
                            </button>

                            {/* Bajar */}
                            <button
                              type="button"
                              onClick={() => handleMoveSubtask(index, 1)}
                              disabled={index === subtasks.length - 1}
                              title="Mover abajo"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: index === subtasks.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-secondary)',
                                cursor: index === subtasks.length - 1 ? 'default' : 'pointer',
                                padding: '4px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <ArrowDown size={14} />
                            </button>

                            {/* Eliminar */}
                            <motion.button
                              whileHover={{ scale: 1.15, color: '#ff4d4d' }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => handleDeleteSubtask(item.id)}
                              title="Eliminar subtarea"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.4)',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s',
                              }}
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* ─── SECCIÓN 2: BLOC DE NOTAS DE ESTUDIO ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                  {/* Barra de herramientas de Markdown / Apuntes */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { label: '• Viñeta', prefix: '• ' },
                        { label: '[ ] Tarea', prefix: '- [ ] ' },
                        { label: '★ Clave', prefix: '📌 ' },
                        { label: '**Negrita**', prefix: '**', suffix: '**' },
                        { label: '`Fórmula`', prefix: '`', suffix: '`' },
                      ].map(snip => (
                        <button
                          key={snip.label}
                          type="button"
                          onClick={() => insertSnippetAtCursor(snip.prefix, snip.suffix || '')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {snip.label}
                        </button>
                      ))}
                    </div>

                    {/* Estado de sincronización */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: saveStatus === 'saving' 
                            ? 'var(--accent-primary)' 
                            : saveStatus === 'saved' 
                            ? 'var(--accent-lime)' 
                            : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {saveStatus === 'saving' && (
                          <RefreshCw size={12} className="animate-spin" />
                        )}
                        {saveStatus === 'saving' && 'Guardando...'}
                        {saveStatus === 'saved' && 'Guardado ✓'}
                        {saveStatus === 'idle' && (notes.trim() ? 'Sincronizado' : 'Sin notas')}
                      </span>

                      <button
                        type="button"
                        onClick={handleManualSaveNotes}
                        title="Forzar guardado inmediato"
                        style={{
                          background: 'rgba(188, 19, 254, 0.1)',
                          border: '1px solid rgba(188, 19, 254, 0.3)',
                          color: 'var(--accent-secondary)',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  {/* Textarea Expandible Cyber Luxe */}
                  <div style={{ position: 'relative', flex: 1, minHeight: '260px' }}>
                    <textarea
                      ref={notesTextareaRef}
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Escribe aquí tus fórmulas, dudas del profesor, pasos metodológicos, enlaces o apuntes clave para resolver este trabajo..."
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '260px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(188, 19, 254, 0.25)',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.92rem',
                        lineHeight: 1.6,
                        outline: 'none',
                        resize: 'none',
                        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent-secondary)';
                        e.target.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.3), 0 0 16px rgba(188, 19, 254, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(188, 19, 254, 0.25)';
                        e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.3)';
                      }}
                    />
                  </div>

                  {/* Contador de caracteres / palabras */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>💡 Tip: Las notas se guardan automáticamente mientras escribes.</span>
                    <span>{notes.length} caracteres · {notes.trim() ? notes.trim().split(/\s+/).length : 0} palabras</span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── FOOTER CON BOTÓN DE CIERRE RÁPIDO ─── */}
            <div 
              style={{
                padding: '16px 28px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(10, 12, 20, 0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                CampusFlow Focus Engine · Auto-Sync
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
